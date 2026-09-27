"""Example: forecast a date range with the trained models, taking features from the ETL API.

    venv/bin/python examples/predict_via_api.py --date-from 2025-11-01 --date-to 2025-11-07 --routes 1 17

The ETL selection starts 56 days before --date-from: the models need that history for profile features.
Works for ranges starting right after the last day with known boardings (Nov-Dec 2025 for this dataset).
"""

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

import httpx
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402
import data  # noqa: E402
from features import build_window  # noqa: E402
from models import LGBMModel, TorchModel  # noqa: E402


def fetch(date_from: date, date_to: date, routes: list[int] | None) -> pd.DataFrame:
    with httpx.Client(base_url=config.ETL_API_URL, timeout=120) as client:
        created = client.post("/make_data", json={"date_from": str(date_from), "date_to": str(date_to), "routes": routes})
        created.raise_for_status()
        rows = client.get(f"/get_data/{created.json()['id']}").raise_for_status().json()["rows"]
    return data.normalize(pd.DataFrame(rows))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date-from", type=date.fromisoformat, required=True)
    parser.add_argument("--date-to", type=date.fromisoformat, required=True)
    parser.add_argument("--routes", type=int, nargs="*")
    args = parser.parse_args()

    frame = fetch(args.date_from - timedelta(days=56), args.date_to, args.routes)
    window = build_window(frame, args.date_from, horizon=(args.date_to - args.date_from).days + 1)
    lgbm = LGBMModel.load(config.ARTIFACTS_DIR / "lightgbm_final.txt")
    torch_model = TorchModel.load(config.ARTIFACTS_DIR / "pytorch_final.pt")
    result = window[["route_id", "date", "hour"]].copy()
    result["lightgbm"] = lgbm.predict(window).round(1)
    result["pytorch"] = torch_model.predict(window).round(1)
    out = config.SUBMISSIONS_DIR / f"example_{args.date_from}_{args.date_to}.csv"
    result.to_csv(out, sep=";", index=False)
    print(result.groupby(["route_id", "date"])[["lightgbm", "pytorch"]].sum().round(0).head(14).to_string())
    print(f"hourly forecast: {out}")


if __name__ == "__main__":
    main()
