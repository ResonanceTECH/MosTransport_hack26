import numpy as np


def wape(y_true, y_pred) -> float:
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    total = y_true.sum()
    return float(np.abs(y_true - y_pred).sum() / total) if total > 0 else float("nan")


def wape_score(y_true, y_pred) -> float:
    """Competition metric: max(0, 1 - WAPE); higher is better."""
    return max(0.0, 1.0 - wape(y_true, y_pred))
