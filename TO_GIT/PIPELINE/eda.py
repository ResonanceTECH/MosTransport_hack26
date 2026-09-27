"""Data evaluation: target structure, seasonality, holidays, weather relation, missing values."""

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import config

EDA_DIR = config.REPORTS_DIR / "eda"


def run_eda(df: pd.DataFrame) -> dict:
    EDA_DIR.mkdir(parents=True, exist_ok=True)
    known = df[df["date"] <= pd.Timestamp(config.DATA_END)].astype({config.TARGET: "float64"})
    daily = known.groupby(["route_id", "date"], as_index=False).agg(
        boardings=(config.TARGET, "sum"), day_type=("day_type", "first"), is_holiday=("is_holiday", "first"),
        temperature_c=("temperature_c", "mean"), precipitation_mm=("precipitation_mm", "sum"),
        snowfall_cm=("snowfall_cm", "sum"),
    )
    city = daily.groupby("date", as_index=False).agg(
        boardings=("boardings", "sum"), day_type=("day_type", "first"), is_holiday=("is_holiday", "first"),
        temperature_c=("temperature_c", "first"), precipitation_mm=("precipitation_mm", "first"),
        snowfall_cm=("snowfall_cm", "first"),
    )
    workdays = city[city["day_type"] == "workday"]
    by_route = known.groupby("route_id")[config.TARGET].agg(["sum", "mean"])
    monthly = city.assign(month=city["date"].dt.month).groupby("month")["boardings"].mean()
    feature_columns = [c for group in config.FEATURE_GROUPS.values() for c in group]

    summary = {
        "rows_total": len(df),
        "rows_with_target": len(known),
        "rows_forecast": int(df[config.TARGET].isna().sum()),
        "boardings_total": int(known[config.TARGET].sum()),
        "zero_hours_share": round(float((known[config.TARGET] == 0).mean()), 4),
        "hours_without_service_0_4_share": round(float(known.loc[known["hour"].between(1, 4), config.TARGET].eq(0).mean()), 4),
        "routes_without_boardings": by_route.index[by_route["sum"] == 0].tolist(),
        "boardings_by_route": by_route["sum"].astype(int).to_dict(),
        "mean_daily_city_by_month": monthly.round(0).astype(int).to_dict(),
        "mean_daily_city_by_day_type": city.groupby("day_type")["boardings"].mean().round(0).astype(int).to_dict(),
        "holiday_vs_workday_ratio": round(float(city.loc[city["is_holiday"] == 1, "boardings"].mean() / workdays["boardings"].mean()), 3),
        "workday_spearman_with_daily_boardings": {
            col: round(float(workdays["boardings"].corr(workdays[col], method="spearman")), 3)
            for col in ["temperature_c", "precipitation_mm", "snowfall_cm"]
        },
        "missing_share_in_features": {c: round(float(df[c].isna().mean()), 4) for c in feature_columns},
        "peak_hour_workday": int(known[known["day_type"] == "workday"].groupby("hour")[config.TARGET].mean().idxmax()),
    }
    (EDA_DIR / "eda_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str))

    fig, ax = plt.subplots(figsize=(13, 4))
    ax.plot(city["date"], city["boardings"], lw=0.8, color="tab:blue", label="all routes, per day")
    holidays = city[city["is_holiday"] == 1]
    ax.scatter(holidays["date"], holidays["boardings"], color="tab:red", s=12, label="official holidays", zorder=3)
    ax.axvline(pd.Timestamp(config.TRAIN_END), color="gray", ls="--", lw=1)
    ax.text(pd.Timestamp(config.TRAIN_END), ax.get_ylim()[1] * 0.97, " train | test", va="top", fontsize=9)
    ax.set_title("Daily boardings, all routes (Jan-Oct 2025)")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(EDA_DIR / "daily_total.png", dpi=120)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(9, 4))
    for day_type, part in known.groupby("day_type"):
        ax.plot(part.groupby("hour")[config.TARGET].mean(), marker="o", ms=3, label=day_type)
    ax.set_xticks(range(24))
    ax.set_xlabel("hour")
    ax.set_ylabel("mean boardings per route-hour")
    ax.set_title("Hourly profile by day type")
    ax.legend()
    fig.tight_layout()
    fig.savefig(EDA_DIR / "hourly_profile.png", dpi=120)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(11, 4))
    route_month = daily.assign(month=daily["date"].dt.month).groupby(["month", "route_id"])["boardings"].mean().unstack()
    route_month.drop(columns=[c for c in route_month if route_month[c].sum() == 0]).plot(ax=ax, marker="o", ms=3)
    ax.set_title("Mean daily boardings by route and month")
    ax.set_xlabel("month")
    ax.legend(title="route", ncol=5, fontsize=8)
    fig.tight_layout()
    fig.savefig(EDA_DIR / "route_month.png", dpi=120)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(workdays["temperature_c"], workdays["boardings"], s=10, alpha=0.6)
    ax.set_xlabel("mean daily temperature, C")
    ax.set_ylabel("daily boardings, workdays")
    ax.set_title("Workday boardings vs temperature")
    fig.tight_layout()
    fig.savefig(EDA_DIR / "temperature.png", dpi=120)
    plt.close(fig)
    return summary
