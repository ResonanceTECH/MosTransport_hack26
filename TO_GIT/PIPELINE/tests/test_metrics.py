import math

import numpy as np

from metrics import wape, wape_score


def test_perfect_forecast_scores_one():
    y = np.array([10, 0, 5])
    assert wape_score(y, y) == 1.0


def test_known_value():
    # |10-8| + |0-1| + |5-5| = 3, sum(y) = 15 -> WAPE 0.2
    assert math.isclose(wape([10, 0, 5], [8, 1, 5]), 0.2)
    assert math.isclose(wape_score([10, 0, 5], [8, 1, 5]), 0.8)


def test_score_is_clipped_at_zero():
    assert wape_score([1, 1], [100, 100]) == 0.0


def test_zero_target_gives_nan_wape():
    assert math.isnan(wape([0, 0], [1, 2]))
