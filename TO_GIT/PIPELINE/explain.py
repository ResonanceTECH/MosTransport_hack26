"""SHAP explanations for the LightGBM and PyTorch models."""

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
import torch

import config
from features import base_level
from models import LGBMModel, TorchModel

# Models predict ratio to the seasonal profile; prediction = ratio * base, so ratio contributions times
# base are exact contributions in boardings (the base itself is the reference point).


def _to_boardings(values: np.ndarray, frame: pd.DataFrame, relative: bool) -> np.ndarray:
    return values * base_level(frame)[:, None] if relative else values

SHAP_DIR = config.REPORTS_DIR / "shap"


def _save_plots(name: str, values: np.ndarray, data: pd.DataFrame) -> pd.DataFrame:
    importance = (pd.DataFrame({"feature": data.columns, "mean_abs_shap": np.abs(values).mean(axis=0)})
                  .sort_values("mean_abs_shap", ascending=False).reset_index(drop=True))
    importance.to_csv(SHAP_DIR / f"{name}_importance.csv", index=False)
    for kind in ("bar", "dot"):
        plt.figure()
        shap.summary_plot(values, data, plot_type=kind, max_display=20, show=False)
        plt.title(f"SHAP {name} ({'mean |SHAP|' if kind == 'bar' else 'impact per row'})")
        plt.tight_layout()
        plt.savefig(SHAP_DIR / f"{name}_{'bar' if kind == 'bar' else 'beeswarm'}.png", dpi=120)
        plt.close()
    return importance


def explain_lgbm(model: LGBMModel, frame: pd.DataFrame) -> pd.DataFrame:
    """TreeSHAP computed natively by LightGBM (pred_contrib), correct for categorical splits."""
    data = frame[model.features]
    contrib = model.booster.predict(data, num_iteration=model.best_iteration, pred_contrib=True)
    return _save_plots("lightgbm", _to_boardings(contrib[:, :-1], frame, model.relative), data)


def explain_torch(model: TorchModel, frame: pd.DataFrame, background: pd.DataFrame) -> pd.DataFrame:
    """Expected gradients (shap.GradientExplainer); one-hot columns are summed back to their feature."""
    x = torch.from_numpy(model.preprocessor.transform(frame))
    x_background = torch.from_numpy(model.preprocessor.transform(background))

    class Scaled(torch.nn.Module):
        def __init__(self, net):
            super().__init__()
            self.net = net

        def forward(self, inputs):
            return (self.net(inputs) * model.output_scale).unsqueeze(-1)

    explainer = shap.GradientExplainer(Scaled(model.model), x_background)
    values = explainer.shap_values(x, nsamples=200, rseed=config.SEED)
    values = np.asarray(values).reshape(len(frame), -1)
    groups = pd.Series(model.preprocessor.output_groups)
    grouped = pd.DataFrame(values).T.groupby(groups.values, sort=False).sum().T
    grouped = grouped[model.features]
    values = _to_boardings(grouped.to_numpy(), frame, model.relative)
    return _save_plots("pytorch", values, frame[model.features].astype("float64"))


def run_shap(lgbm: LGBMModel, torch_model: TorchModel, frame: pd.DataFrame, background: pd.DataFrame,
             n_rows: int = 2000) -> dict:
    SHAP_DIR.mkdir(parents=True, exist_ok=True)
    sample = frame.sample(min(n_rows, len(frame)), random_state=config.SEED)
    lgbm_importance = explain_lgbm(lgbm, sample)
    torch_importance = explain_torch(torch_model, sample.head(min(800, len(sample))),
                                     background.sample(min(300, len(background)), random_state=config.SEED))
    comparison = lgbm_importance.merge(torch_importance, on="feature", suffixes=("_lightgbm", "_pytorch"))
    comparison.to_csv(SHAP_DIR / "importance_comparison.csv", index=False)
    return {"lightgbm_top": lgbm_importance.head(10).to_dict("records"),
            "pytorch_top": torch_importance.head(10).to_dict("records")}
