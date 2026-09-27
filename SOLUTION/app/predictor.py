"""Loads model.pkl and predicts boardings with baseline, LightGBM, PyTorch or their ensemble."""

import pickle
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
import torch
from torch import nn

from app.features import base_level, has_history

MODELS = ("ensemble", "lightgbm", "pytorch", "baseline")
ONE_HOT_VOCABULARY = {"route_id": [1, 5, 7, 11, 12, 17, 25, 26, 28, 50], "hour": list(range(24)), "day_of_week": list(range(7))}


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


class Predictor:
    def __init__(self, path: Path):
        with Path(path).open("rb") as f:
            self.bundle = pickle.load(f)
        if self.bundle.get("format_version") != 1:
            raise ValueError(f"unsupported model.pkl format: {self.bundle.get('format_version')}")
        self.default_model: str = self.bundle["default_model"]
        self.weight = float(self.bundle["ensemble_weight_lightgbm"])
        lgbm = self.bundle["lightgbm"]
        self.lgbm = lgb.Booster(model_str=lgbm["model_str"])
        self.lgbm_features = lgbm["features"]
        spec = self.bundle["pytorch"]
        self.torch_features = spec["features"]
        self.prep = spec["preprocessor"]
        n_inputs = len(self.prep["numeric"]) + sum(len(ONE_HOT_VOCABULARY[c]) for c in self.prep["categorical"])
        self.mlp = MLP(n_inputs, spec["params"]["hidden"], spec["params"]["dropout"])
        self.mlp.load_state_dict({k: torch.from_numpy(np.asarray(v)) for k, v in spec["state_dict"].items()})
        self.mlp.eval()

    @property
    def info(self) -> dict:
        b = self.bundle
        return {"default_model": self.default_model, "models": list(MODELS), "trained_on": b["trained_on"],
                "created_at": b["created_at"], "horizon_days": b["horizon_days"],
                "history_days_required": b["history_days_required"], "platform_scores": b["metrics"].get("platform", {})}

    def _torch_input(self, frame: pd.DataFrame) -> np.ndarray:
        numeric = frame[self.prep["numeric"]].astype("float64").fillna(self.prep["median"])
        numeric = (numeric - pd.Series(self.prep["mean"])) / pd.Series(self.prep["std"])
        parts = [numeric.to_numpy(dtype="float32")]
        for column in self.prep["categorical"]:
            codes = frame[column].to_numpy()
            parts.append(np.stack([codes == v for v in ONE_HOT_VOCABULARY[column]], axis=1).astype("float32"))
        return np.concatenate(parts, axis=1)

    def _lightgbm(self, frame: pd.DataFrame) -> np.ndarray:
        return self.lgbm.predict(frame[self.lgbm_features]) * base_level(frame)

    def _pytorch(self, frame: pd.DataFrame) -> np.ndarray:
        with torch.no_grad():
            ratio = self.mlp(torch.from_numpy(self._torch_input(frame))).numpy().astype("float64")
        return ratio * base_level(frame)

    def predict(self, frame: pd.DataFrame, model: str) -> np.ndarray:
        if model == "baseline":
            raw = frame["p_daytype_28"].fillna(0).to_numpy(dtype="float64")
        elif model == "lightgbm":
            raw = self._lightgbm(frame)
        elif model == "pytorch":
            raw = self._pytorch(frame)
        elif model == "ensemble":
            raw = self.weight * np.clip(self._lightgbm(frame), 0, None) + (1 - self.weight) * np.clip(self._pytorch(frame), 0, None)
        else:
            raise ValueError(f"unknown model {model}")
        return np.where(has_history(frame), np.clip(raw, 0, None), 0.0)
