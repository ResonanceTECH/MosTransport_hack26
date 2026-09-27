import os
from datetime import date
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
# Organizers' dataset (test_submission.csv, labels/) — unpack dataset.zip here or point DATASET_DIR to it.
DATASET_DIR = Path(os.getenv("DATASET_DIR") or ML_DIR / "dataset")
DATA_DIR = ML_DIR / "data"
ARTIFACTS_DIR = ML_DIR / "artifacts"
REPORTS_DIR = ML_DIR / "reports"
SUBMISSIONS_DIR = ML_DIR / "submissions"

ETL_API_URL = os.getenv("ETL_API_URL", "http://localhost:8000")
SUBMISSION_TEMPLATE = DATASET_DIR / "test_submission.csv"
LABEL_FILES = {
    "train": DATASET_DIR / "labels" / "labels_day_train.csv",
    "test": DATASET_DIR / "labels" / "labels_day_test.csv",
}

ROUTES = [1, 5, 7, 11, 12, 17, 25, 26, 28, 50]
DATA_START = date(2025, 1, 1)
TRAIN_END = date(2025, 8, 31)
DATA_END = date(2025, 10, 31)
FORECAST_START, FORECAST_END = date(2025, 11, 1), date(2025, 12, 31)
HORIZON_DAYS = (FORECAST_END - FORECAST_START).days + 1  # 61, as in the submission

# Backtest: each window forecasts HORIZON_DAYS days from its origin using only data before the origin.
# Hyperparameters and ensemble weights are chosen on TUNING_ORIGINS, whose forecast periods end before
# Sep 1. HOLDOUT_ORIGIN (Sep-Oct = organizers' test period) is used only for the final comparison.
# The Aug 1 window overlaps the holdout, so it is reported but never used for any choice.
TUNING_ORIGINS = [date(2025, 6, 1), date(2025, 7, 1)]
HOLDOUT_ORIGIN = date(2025, 9, 1)
BACKTEST_ORIGINS = [*TUNING_ORIGINS, date(2025, 8, 1), HOLDOUT_ORIGIN]
# Windows from February (profiles on the available 4+ weeks of January) add winter cases for Nov-Dec.
FIRST_TRAIN_ORIGIN = date(2025, 2, 1)
ORIGIN_STEP_DAYS = 7

SEED = 42

TARGET = "boardings"
KEYS = ["route_id", "date", "hour"]

CALENDAR_FEATURES = ["is_dayoff", "is_short_day", "is_holiday", "is_transfer_workday", "is_saturday_profile", "is_sunday_profile"]
WEATHER_FEATURES = ["temperature_c", "precipitation_mm", "snowfall_cm", "wind_speed_ms", "humidity_pct", "cloud_cover_pct",
                    "is_rain", "is_snow"]
TRAFFIC_FEATURES = ["traffic_congestion_index", "traffic_duration_s"]
FEATURE_GROUPS = {"calendar": CALENDAR_FEATURES, "weather": WEATHER_FEATURES, "traffic": TRAFFIC_FEATURES}
