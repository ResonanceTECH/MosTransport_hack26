"""Hyperparameter search with Optuna on the tuning backtest windows (never on the holdout)."""

import logging

import numpy as np
import optuna
import pandas as pd

import config
from metrics import wape
from models import LGBMModel, TorchModel

log = logging.getLogger("ml.tuning")


def tune_lgbm(windows: list[dict], features: list[str], n_trials: int) -> tuple[dict, pd.DataFrame]:
    """Mean WAPE over windows; the number of trees is the best iteration on each window's error curve."""

    def objective(trial: optuna.Trial) -> float:
        params = {
            "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.12, log=True),
            "num_leaves": trial.suggest_int("num_leaves", 15, 255, log=True),
            "min_data_in_leaf": trial.suggest_int("min_data_in_leaf", 10, 400, log=True),
            "feature_fraction": trial.suggest_float("feature_fraction", 0.5, 1.0),
            "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5, 1.0),
            "lambda_l2": trial.suggest_float("lambda_l2", 1e-3, 30, log=True),
            "objective": trial.suggest_categorical("objective", ["l1", "huber"]),
        }
        scores, iterations = [], []
        for window in windows:
            model = LGBMModel(params, num_boost_round=1000).fit(window["train"], features, valid=window["valid"])
            scores.append(wape(window["valid"][config.TARGET], model.predict(window["valid"])))
            iterations.append(model.best_iteration)
        trial.set_user_attr("best_iteration", int(np.mean(iterations)))
        return float(np.mean(scores))

    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=config.SEED))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    best = {"params": study.best_params, "num_boost_round": study.best_trial.user_attrs["best_iteration"],
            "tuning_wape": study.best_value}
    log.info("LightGBM best mean WAPE %.4f: %s", study.best_value, best)
    return best, study.trials_dataframe()


def tune_torch(windows: list[dict], features: list[str], n_trials: int) -> tuple[dict, pd.DataFrame]:
    architectures = {"256-128-64": [256, 128, 64], "512-256-128": [512, 256, 128], "128-64": [128, 64],
                     "256-256": [256, 256]}

    def objective(trial: optuna.Trial) -> float:
        params = {
            "hidden": architectures[trial.suggest_categorical("hidden", list(architectures))],
            "dropout": trial.suggest_float("dropout", 0.0, 0.3),
            "lr": trial.suggest_float("lr", 5e-4, 5e-3, log=True),
            "weight_decay": trial.suggest_float("weight_decay", 1e-6, 1e-2, log=True),
            "epochs": trial.suggest_int("epochs", 10, 40, step=5),
            "batch_size": trial.suggest_categorical("batch_size", [512, 1024, 2048]),
        }
        scores = []
        for window in windows:
            model = TorchModel(params).fit(window["train"], features)
            scores.append(wape(window["valid"][config.TARGET], model.predict(window["valid"])))
        return float(np.mean(scores))

    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=config.SEED))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    params = {**study.best_params, "hidden": architectures[study.best_params["hidden"]]}
    best = {"params": params, "tuning_wape": study.best_value}
    log.info("PyTorch best mean WAPE %.4f: %s", study.best_value, best)
    return best, study.trials_dataframe()
