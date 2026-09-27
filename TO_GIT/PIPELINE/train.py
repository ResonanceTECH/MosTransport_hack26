"""ML pipeline: data -> EDA -> tuning -> backtest -> final training -> submission -> SHAP.

Usage (from the ML folder):
    venv/bin/python train.py all                      # everything below in order
    venv/bin/python train.py prepare [--source api|db] # dataset from the ETL service
    venv/bin/python train.py eda
    venv/bin/python train.py tune [--lgbm-trials 25] [--torch-trials 10]
    venv/bin/python train.py evaluate                 # backtest, model comparison, ablation
    venv/bin/python train.py final                    # train on Jan-Oct, forecast Nov-Dec, write submissions
    venv/bin/python train.py explain                  # SHAP
    venv/bin/python train.py export [--output path]   # model.pkl for the prediction service
"""

import argparse
import json
import logging
import pickle
import time
from datetime import timedelta
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import config
import data
import tuning
from eda import run_eda
from explain import run_shap
from features import build_training_set, build_window, feature_columns
from metrics import wape_score
from models import Ensemble, LGBMModel, SeasonalBaseline, TorchModel
from submission import make_submission, validate_submission

log = logging.getLogger("ml.train")

BEST_PARAMS = config.ARTIFACTS_DIR / "best_params.json"
METRICS = config.REPORTS_DIR / "metrics.json"
LGBM_PATH = config.ARTIFACTS_DIR / "lightgbm_final.txt"
TORCH_PATH = config.ARTIFACTS_DIR / "pytorch_final.pt"
MODEL_NAMES = ["baseline", "lightgbm", "pytorch", "ensemble"]


def dump(path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str))


def make_window(df: pd.DataFrame, origin) -> dict:
    """Training set from data before the origin + the 61-day forecast window after it."""
    return {
        "origin": origin,
        "train": build_training_set(df, origin - timedelta(days=1)),
        "valid": build_window(df, origin).dropna(subset=[config.TARGET]),
    }


def load_best_params() -> dict:
    if BEST_PARAMS.exists():
        return json.loads(BEST_PARAMS.read_text())
    log.warning("%s not found, using default hyperparameters (run `train.py tune`)", BEST_PARAMS)
    return {"lightgbm": {"params": {}, "num_boost_round": 800}, "pytorch": {"params": {}}}


def fit_models(train: pd.DataFrame, features: list[str], best: dict) -> dict:
    return {
        "baseline": SeasonalBaseline(),
        "lightgbm": LGBMModel(best["lightgbm"]["params"], best["lightgbm"]["num_boost_round"]).fit(train, features),
        "pytorch": TorchModel(best["pytorch"]["params"]).fit(train, features),
    }


def cmd_prepare(args) -> None:
    df = data.prepare(args.source)
    print(f"dataset: {len(df)} rows -> {data.DATASET_PARQUET}, {data.DATASET_CSV}")
    print("labels check:", data.check_against_labels(df))


def cmd_eda(args) -> None:
    summary = run_eda(data.load_dataset())
    print(json.dumps({k: summary[k] for k in ("rows_with_target", "zero_hours_share", "holiday_vs_workday_ratio",
                                               "mean_daily_city_by_day_type")}, ensure_ascii=False))


def cmd_tune(args) -> None:
    df, features = data.load_dataset(), feature_columns()
    windows = [make_window(df, origin) for origin in config.TUNING_ORIGINS]
    log.info("tuning windows: %s", [(str(w["origin"]), len(w["train"]), len(w["valid"])) for w in windows])
    previous = json.loads(BEST_PARAMS.read_text()) if BEST_PARAMS.exists() else {}
    config.REPORTS_DIR.mkdir(exist_ok=True)
    best = {"tuning_origins": [str(o) for o in config.TUNING_ORIGINS]}
    # --*-trials 0 keeps the previously found parameters of that model.
    for name, tune, trials in (("lightgbm", tuning.tune_lgbm, args.lgbm_trials), ("pytorch", tuning.tune_torch, args.torch_trials)):
        if trials == 0 and name in previous:
            best[name] = previous[name]
            continue
        best[name], history = tune(windows, features, trials)
        history.to_csv(config.REPORTS_DIR / f"tuning_{name}.csv", index=False)
    dump(BEST_PARAMS, best)
    print(f"LightGBM tuning WAPE-score {1 - best['lightgbm']['tuning_wape']:.4f}, "
          f"PyTorch {1 - best['pytorch']['tuning_wape']:.4f}")


def choose_ensemble_weight(tuning_predictions: list[dict]) -> float:
    """LightGBM weight in [0, 1] maximizing mean WAPE-score on the tuning windows."""
    grid = np.round(np.linspace(0, 1, 11), 2)
    scores = [np.mean([wape_score(p["y"], w * p["lightgbm"] + (1 - w) * p["pytorch"]) for p in tuning_predictions])
              for w in grid]
    return float(grid[int(np.argmax(scores))])


def select_best_model(table: pd.DataFrame) -> str:
    """Model for submission.csv: best mean WAPE-score over all backtest windows (8 months of 61-day forecasts).

    Choosing by the two tuning windows alone favoured LightGBM, which then lost to the seasonal baseline on
    both later windows; the later windows are the closest to the final setting (more history, season change).
    """
    return str(table.loc[["lightgbm", "pytorch", "ensemble"], "mean_all"].idxmax())


def cmd_evaluate(args) -> None:
    df, best, features = data.load_dataset(), load_best_params(), feature_columns()
    rows, window_predictions, holdout = [], [], None
    for origin in config.BACKTEST_ORIGINS:
        started = time.perf_counter()
        window = make_window(df, origin)
        models = fit_models(window["train"], features, best)
        predictions = {"y": window["valid"][config.TARGET].to_numpy(), "origin": origin}
        predictions.update({name: model.predict(window["valid"]) for name, model in models.items()})
        window_predictions.append(predictions)
        if origin == config.HOLDOUT_ORIGIN:
            holdout = window
        log.info("window %s: %d train rows, %.0fs", origin, len(window["train"]), time.perf_counter() - started)

    weight = choose_ensemble_weight([p for p in window_predictions if p["origin"] in config.TUNING_ORIGINS])
    for p in window_predictions:
        p["ensemble"] = weight * p["lightgbm"] + (1 - weight) * p["pytorch"]
        role = "holdout" if p["origin"] == config.HOLDOUT_ORIGIN else "tuning" if p["origin"] in config.TUNING_ORIGINS else "extra"
        for name in MODEL_NAMES:
            rows.append({"origin": str(p["origin"]), "role": role, "model": name, "wape_score": wape_score(p["y"], p[name])})
    scores = pd.DataFrame(rows)
    table = scores.pivot_table(index="model", columns="origin", values="wape_score").reindex(MODEL_NAMES)
    table["mean_tuning"] = scores[scores["role"] == "tuning"].groupby("model")["wape_score"].mean()
    table["mean_all"] = scores.groupby("model")["wape_score"].mean()
    table = table.round(4)
    table.to_csv(config.REPORTS_DIR / "model_comparison.csv")

    hp = next(p for p in window_predictions if p["origin"] == config.HOLDOUT_ORIGIN)
    frame = holdout["valid"][config.KEYS + ["day_type"]].copy()
    for name in ["y", *MODEL_NAMES]:
        frame[name] = hp[name]
    frame.to_parquet(config.REPORTS_DIR / "holdout_predictions.parquet", index=False)
    by_route = pd.DataFrame({name: frame.groupby("route_id").apply(lambda g, n=name: wape_score(g["y"], g[n]) if g["y"].sum() else np.nan,
                                                                    include_groups=False) for name in MODEL_NAMES}).round(4)
    by_route.to_csv(config.REPORTS_DIR / "holdout_by_route.csv")
    frame["week"] = (frame["date"] - pd.Timestamp(config.HOLDOUT_ORIGIN)).dt.days // 7 + 1
    by_week = pd.DataFrame({name: frame.groupby("week").apply(lambda g, n=name: wape_score(g["y"], g[n]), include_groups=False)
                            for name in MODEL_NAMES}).round(4)
    by_week.to_csv(config.REPORTS_DIR / "holdout_by_week.csv")
    plot_holdout(frame)

    ablation = run_ablation(holdout, best)
    best_model = select_best_model(table)
    dump(METRICS, {
        "comparison": table.reset_index().to_dict("records"),
        "holdout_origin": str(config.HOLDOUT_ORIGIN),
        "holdout_wape_score": table[str(config.HOLDOUT_ORIGIN)].to_dict(),
        "ensemble_weight_lightgbm": weight,
        "best_model": best_model,
        "ablation_holdout": ablation.to_dict("records"),
    })
    print(table.to_string())
    print(f"ensemble weight (LightGBM) = {weight}; model for submission.csv: {best_model}")
    print(ablation.to_string(index=False))


def run_ablation(window: dict, best: dict) -> pd.DataFrame:
    """LightGBM on the holdout: history profiles only, then each external group added, then all."""
    variants = {"profiles only": (), "+ calendar": ("calendar",), "+ weather": ("weather",), "+ traffic": ("traffic",),
                "calendar + weather": ("calendar", "weather"), "all sources": tuple(config.FEATURE_GROUPS)}
    rows = []
    for name, groups in variants.items():
        model = LGBMModel(best["lightgbm"]["params"], best["lightgbm"]["num_boost_round"]).fit(window["train"], feature_columns(groups))
        rows.append({"variant": name, "wape_score": round(wape_score(window["valid"][config.TARGET], model.predict(window["valid"])), 4)})
    table = pd.DataFrame(rows)
    table["gain_vs_profiles_only"] = (table["wape_score"] - table.loc[0, "wape_score"]).round(4)
    table.to_csv(config.REPORTS_DIR / "ablation.csv", index=False)
    return table


def plot_holdout(frame: pd.DataFrame) -> None:
    daily = frame.groupby("date")[["y", *MODEL_NAMES]].sum()
    fig, ax = plt.subplots(figsize=(13, 4.5))
    ax.plot(daily.index, daily["y"], color="black", lw=2, label="actual")
    for name in MODEL_NAMES:
        ax.plot(daily.index, daily[name], lw=1.2, label=name)
    ax.set_title(f"Holdout {config.HOLDOUT_ORIGIN} + 61 days: daily boardings, all routes")
    ax.legend(ncol=5)
    fig.tight_layout()
    fig.savefig(config.REPORTS_DIR / "holdout_daily.png", dpi=120)
    plt.close(fig)


def cmd_final(args) -> None:
    df, best, features = data.load_dataset(), load_best_params(), feature_columns()
    metrics = json.loads(METRICS.read_text()) if METRICS.exists() else {}
    weight = metrics.get("ensemble_weight_lightgbm", 0.5)
    train = build_training_set(df, config.DATA_END)
    forecast = build_window(df, config.FORECAST_START)
    if len(forecast) != len(config.ROUTES) * config.HORIZON_DAYS * 24:
        raise ValueError(f"forecast grid has {len(forecast)} rows")
    log.info("final training: %d rows from %d origins, forecast %d rows", len(train), train["origin"].nunique(), len(forecast))
    models = fit_models(train, features, best)
    models["ensemble"] = Ensemble([models["lightgbm"], models["pytorch"]], [weight, 1 - weight])
    config.ARTIFACTS_DIR.mkdir(exist_ok=True)
    models["lightgbm"].save(LGBM_PATH)
    models["pytorch"].save(TORCH_PATH)

    config.SUBMISSIONS_DIR.mkdir(exist_ok=True)
    report = {}
    for name in MODEL_NAMES:
        path = config.SUBMISSIONS_DIR / f"submission_{name}.csv"
        make_submission(forecast, models[name].predict(forecast)).to_csv(path, sep=";", index=False)
        report[name] = validate_submission(path)
    chosen = metrics.get("best_model", "ensemble")
    main_path = config.SUBMISSIONS_DIR / "submission.csv"
    main_path.write_bytes((config.SUBMISSIONS_DIR / f"submission_{chosen}.csv").read_bytes())
    report["submission.csv"] = {**validate_submission(main_path), "model": chosen}
    dump(config.SUBMISSIONS_DIR / "validation.json", report)
    print(f"submissions written to {config.SUBMISSIONS_DIR}; submission.csv = {chosen}")
    for name, info in report.items():
        print(f"  {name}: rows={info['rows']} total={info['total_prediction']} valid={info['valid']}")


def cmd_explain(args) -> None:
    df = data.load_dataset()
    forecast = build_window(df, config.FORECAST_START)
    background = build_training_set(df, config.DATA_END)
    summary = run_shap(LGBMModel.load(LGBM_PATH), TorchModel.load(TORCH_PATH), forecast[forecast["level_28"] > 0], background)
    dump(config.REPORTS_DIR / "shap" / "summary.json", summary)
    for model, top in summary.items():
        print(model, [f"{r['feature']}={r['mean_abs_shap']:.1f}" for r in top[:6]])


PLATFORM_SCORES = config.REPORTS_DIR / "platform_scores.json"


def cmd_export(args) -> None:
    """model.pkl for the prediction service: plain Python/NumPy objects only (no pipeline classes inside),
    so the file loads regardless of how the service code is organized."""
    lgbm, torch_model = LGBMModel.load(LGBM_PATH), TorchModel.load(TORCH_PATH)
    metrics = json.loads(METRICS.read_text())
    platform = json.loads(PLATFORM_SCORES.read_text()) if PLATFORM_SCORES.exists() else {}
    bundle = {
        "format_version": 1,
        "created_at": pd.Timestamp.now(tz="Europe/Moscow").isoformat(),
        "target": "boardings: successful validations per route and hour",
        "routes": config.ROUTES,
        "trained_on": {"from": str(config.DATA_START), "to": str(config.DATA_END)},
        "horizon_days": config.HORIZON_DAYS,
        "history_days_required": 56,
        "default_model": platform.get("best", metrics.get("best_model", "ensemble")),
        "ensemble_weight_lightgbm": metrics["ensemble_weight_lightgbm"],
        "lightgbm": {"model_str": lgbm.booster.model_to_string(num_iteration=lgbm.best_iteration),
                     "features": lgbm.features, "relative": lgbm.relative, "params": lgbm.params},
        "pytorch": {"params": torch_model.params, "features": torch_model.features, "relative": torch_model.relative,
                    "preprocessor": torch_model.preprocessor.state(),
                    "state_dict": {k: v.cpu().numpy() for k, v in torch_model.model.state_dict().items()}},
        "metrics": {"local_backtest": metrics["comparison"], "platform": platform.get("scores", {})},
    }
    path = Path(args.output) if args.output else config.ARTIFACTS_DIR / "model.pkl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        pickle.dump(bundle, f, protocol=pickle.HIGHEST_PROTOCOL)
    print(f"model bundle -> {path} ({path.stat().st_size / 1024:.0f} KB), default model: {bundle['default_model']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Transport boardings forecasting pipeline")
    parser.add_argument("command", choices=["prepare", "eda", "tune", "evaluate", "final", "explain", "export", "all"])
    parser.add_argument("--source", choices=["api", "db"], default="api", help="where prepare takes the ETL data from")
    parser.add_argument("--lgbm-trials", type=int, default=25)
    parser.add_argument("--torch-trials", type=int, default=10)
    parser.add_argument("--output", help="export: path of model.pkl (default artifacts/model.pkl)")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("optuna").setLevel(logging.WARNING)
    commands = {"prepare": cmd_prepare, "eda": cmd_eda, "tune": cmd_tune, "evaluate": cmd_evaluate,
                "final": cmd_final, "explain": cmd_explain, "export": cmd_export}
    steps = list(commands) if args.command == "all" else [args.command]
    for step in steps:
        started = time.perf_counter()
        log.info("=== %s", step)
        commands[step](args)
        log.info("=== %s done in %.0fs", step, time.perf_counter() - started)


if __name__ == "__main__":
    main()
