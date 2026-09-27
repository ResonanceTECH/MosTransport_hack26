"""Models: seasonal baseline, LightGBM and PyTorch MLP with a common fit/predict/save interface."""

import json
import random
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
import torch
from torch import nn

import config
from features import CATEGORICAL_FEATURES, base_level, has_history


def relative_target(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Label = boardings / base and weight = base: weighted L1 on the ratio equals L1 on boardings (WAPE)."""
    base = base_level(frame)
    return frame[config.TARGET].to_numpy(dtype="float64") / base, base


def _finalize(frame: pd.DataFrame, prediction: np.ndarray) -> np.ndarray:
    """Forecasts are non-negative; routes without recent history (route 5) are forecast as 0."""
    return np.where(has_history(frame), np.clip(prediction, 0, None), 0.0)


class SeasonalBaseline:
    """Mean boardings for the same route, hour and day type over the 4 weeks before the origin."""

    name = "baseline"

    def fit(self, train: pd.DataFrame, features: list[str]) -> "SeasonalBaseline":
        return self

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        return _finalize(frame, frame["p_daytype_28"].fillna(0).to_numpy())


class LGBMModel:
    name = "lightgbm"
    DEFAULT_PARAMS = {
        "objective": "l1",
        "learning_rate": 0.05,
        "num_leaves": 63,
        "min_data_in_leaf": 50,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 1,
        "lambda_l2": 1.0,
    }

    def __init__(self, params: dict | None = None, num_boost_round: int = 800, relative: bool = True):
        self.params = {**self.DEFAULT_PARAMS, **(params or {}), "seed": config.SEED, "verbose": -1, "num_threads": 0}
        self.num_boost_round = num_boost_round
        self.relative = relative
        self.features: list[str] = []
        self.booster: lgb.Booster | None = None
        self.best_iteration: int | None = None

    def _dataset(self, frame: pd.DataFrame, reference=None) -> lgb.Dataset:
        categorical = [c for c in CATEGORICAL_FEATURES if c in self.features]
        label, weight = relative_target(frame) if self.relative else (frame[config.TARGET], None)
        return lgb.Dataset(frame[self.features], label=label, weight=weight, categorical_feature=categorical,
                           reference=reference, free_raw_data=False)

    def raw_predict(self, frame: pd.DataFrame) -> np.ndarray:
        """Model output: ratio to the seasonal profile if relative, boardings otherwise."""
        return self.booster.predict(frame[self.features], num_iteration=self.best_iteration)

    def fit(self, train: pd.DataFrame, features: list[str], valid: pd.DataFrame | None = None) -> "LGBMModel":
        """With `valid`, trains all rounds and keeps the iteration with the lowest (weighted) L1 on it.

        Plain early stopping is not used: with L1 the validation error barely moves for the first
        dozens of rounds, and a short patience stops training while the model is still a constant.
        """
        self.features = list(features)
        train_set = self._dataset(train)
        if valid is None:
            self.booster = lgb.train(self.params, train_set, num_boost_round=self.num_boost_round)
            self.best_iteration = self.num_boost_round
            return self
        curve: dict = {}
        self.booster = lgb.train({**self.params, "metric": "l1"}, train_set, num_boost_round=self.num_boost_round,
                                 valid_sets=[self._dataset(valid, reference=train_set)],
                                 callbacks=[lgb.record_evaluation(curve)])
        self.best_iteration = int(np.argmin(curve["valid_0"]["l1"])) + 1
        return self

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        raw = self.raw_predict(frame)
        return _finalize(frame, raw * base_level(frame) if self.relative else raw)

    def save(self, path: Path) -> None:
        self.booster.save_model(str(path), num_iteration=self.best_iteration)
        path.with_suffix(".json").write_text(json.dumps(
            {"features": self.features, "params": self.params, "best_iteration": self.best_iteration,
             "relative": self.relative}, indent=2))

    @classmethod
    def load(cls, path: Path) -> "LGBMModel":
        meta = json.loads(path.with_suffix(".json").read_text())
        model = cls(meta["params"], relative=meta["relative"])
        model.features, model.best_iteration = meta["features"], meta["best_iteration"]
        model.booster = lgb.Booster(model_file=str(path))
        return model


class TabularPreprocessor:
    """Numeric: median imputation + standardization; categorical: one-hot with a fixed vocabulary."""

    VOCABULARY = {"route_id": config.ROUTES, "hour": list(range(24)), "day_of_week": list(range(7))}

    def fit(self, frame: pd.DataFrame, features: list[str]) -> "TabularPreprocessor":
        self.categorical = [c for c in CATEGORICAL_FEATURES if c in features]
        self.numeric = [c for c in features if c not in self.categorical]
        values = frame[self.numeric].astype("float64")
        self.median = values.median().fillna(0).to_dict()
        filled = values.fillna(self.median)
        self.mean = filled.mean().to_dict()
        self.std = filled.std().replace(0, 1).fillna(1).to_dict()
        return self

    @property
    def output_names(self) -> list[str]:
        return self.numeric + [f"{c}={v}" for c in self.categorical for v in self.VOCABULARY[c]]

    @property
    def output_groups(self) -> list[str]:
        """Original feature of every output column (to sum one-hot SHAP values back)."""
        return self.numeric + [c for c in self.categorical for _ in self.VOCABULARY[c]]

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        numeric = frame[self.numeric].astype("float64").fillna(self.median)
        numeric = (numeric - pd.Series(self.mean)) / pd.Series(self.std)
        parts = [numeric.to_numpy(dtype="float32")]
        for column in self.categorical:
            codes = frame[column].to_numpy()
            parts.append(np.stack([(codes == v) for v in self.VOCABULARY[column]], axis=1).astype("float32"))
        return np.concatenate(parts, axis=1)

    def state(self) -> dict:
        return {k: getattr(self, k) for k in ("categorical", "numeric", "median", "mean", "std")}

    @classmethod
    def from_state(cls, state: dict) -> "TabularPreprocessor":
        obj = cls()
        obj.__dict__.update(state)
        return obj


class MLP(nn.Module):
    def __init__(self, n_inputs: int, hidden: list[int], dropout: float):
        super().__init__()
        layers, width = [], n_inputs
        for size in hidden:
            layers += [nn.Linear(width, size), nn.ReLU(), nn.Dropout(dropout)]
            width = size
        layers.append(nn.Linear(width, 1))
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x).squeeze(-1)


def set_seed(seed: int = config.SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


class TorchModel:
    """MLP trained with weighted L1 on the ratio to the seasonal profile (= L1 on boardings, i.e. WAPE).

    With relative=False it learns boardings / TARGET_SCALE with plain L1.
    """

    name = "pytorch"
    TARGET_SCALE = 1000.0
    DEFAULT_PARAMS = {"hidden": [256, 128, 64], "dropout": 0.1, "lr": 2e-3, "weight_decay": 1e-4,
                      "epochs": 25, "batch_size": 1024}

    def __init__(self, params: dict | None = None, relative: bool = True):
        self.params = {**self.DEFAULT_PARAMS, **(params or {})}
        self.relative = relative
        self.preprocessor: TabularPreprocessor | None = None
        self.model: MLP | None = None
        self.features: list[str] = []

    @property
    def output_scale(self) -> float:
        return 1.0 if self.relative else self.TARGET_SCALE

    def fit(self, train: pd.DataFrame, features: list[str], log_every: int = 0) -> "TorchModel":
        set_seed()
        self.features = list(features)
        self.preprocessor = TabularPreprocessor().fit(train, self.features)
        x = torch.from_numpy(self.preprocessor.transform(train))
        if self.relative:
            label, weight = relative_target(train)
        else:
            label, weight = train[config.TARGET].to_numpy() / self.TARGET_SCALE, np.ones(len(train))
        y = torch.from_numpy(label.astype("float32"))
        w = torch.from_numpy(weight.astype("float32"))
        self.model = MLP(x.shape[1], self.params["hidden"], self.params["dropout"])
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.params["lr"], weight_decay=self.params["weight_decay"])
        steps_per_epoch = int(np.ceil(len(x) / self.params["batch_size"]))
        scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=self.params["lr"],
                                                        epochs=self.params["epochs"], steps_per_epoch=steps_per_epoch)
        generator = torch.Generator().manual_seed(config.SEED)
        self.model.train()
        for epoch in range(self.params["epochs"]):
            order = torch.randperm(len(x), generator=generator)
            total = 0.0
            for start in range(0, len(x), self.params["batch_size"]):
                idx = order[start : start + self.params["batch_size"]]
                optimizer.zero_grad()
                loss = (w[idx] * (self.model(x[idx]) - y[idx]).abs()).sum() / w[idx].sum()
                loss.backward()
                optimizer.step()
                scheduler.step()
                total += loss.item() * len(idx)
            if log_every and (epoch + 1) % log_every == 0:
                print(f"  epoch {epoch + 1}/{self.params['epochs']}: train loss {total / len(x):.4f}")
        self.model.eval()
        return self

    def raw_predict(self, frame: pd.DataFrame) -> np.ndarray:
        with torch.no_grad():
            return self.model(torch.from_numpy(self.preprocessor.transform(frame))).numpy().astype("float64")

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        raw = self.raw_predict(frame)
        return _finalize(frame, raw * base_level(frame) if self.relative else raw * self.TARGET_SCALE)

    def save(self, path: Path) -> None:
        torch.save({"params": self.params, "features": self.features, "state_dict": self.model.state_dict(),
                    "preprocessor": self.preprocessor.state(), "relative": self.relative}, path)

    @classmethod
    def load(cls, path: Path) -> "TorchModel":
        payload = torch.load(path, weights_only=False)
        model = cls(payload["params"], relative=payload["relative"])
        model.features = payload["features"]
        model.preprocessor = TabularPreprocessor.from_state(payload["preprocessor"])
        model.model = MLP(len(model.preprocessor.output_names), model.params["hidden"], model.params["dropout"])
        model.model.load_state_dict(payload["state_dict"])
        model.model.eval()
        return model


class Ensemble:
    """Weighted average of fitted models."""

    name = "ensemble"

    def __init__(self, models: list, weights: list[float] | None = None):
        self.models = models
        self.weights = weights or [1.0 / len(models)] * len(models)

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        return sum(w * m.predict(frame) for m, w in zip(self.models, self.weights))
