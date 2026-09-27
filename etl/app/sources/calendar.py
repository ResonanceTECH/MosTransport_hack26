"""Production calendar integration.

Source: https://github.com/isdayoff/calendars/tree/main/db/2026
For 2027, we generate based on Russian labor code rules.
"""

import logging
from datetime import date, timedelta
from typing import Dict, List

logger = logging.getLogger(__name__)

# Russian public holidays (fixed dates)
FIXED_HOLIDAYS = {
    (1, 1): "Новый год",
    (1, 2): "Новогодние каникулы",
    (1, 3): "Новогодние каникулы",
    (1, 4): "Новогодние каникулы",
    (1, 5): "Новогодние каникулы",
    (1, 6): "Новогодние каникулы",
    (1, 7): "Рождество Христово",
    (1, 8): "Новогодние каникулы",
    (2, 23): "День защитника Отечества",
    (3, 8): "Международный женский день",
    (5, 1): "Праздник Весны и Труда",
    (5, 9): "День Победы",
    (6, 12): "День России",
    (11, 4): "День народного единства",
}

# School holidays (approximate)
SCHOOL_HOLIDAYS = {
    "autumn": ((10, 28), (11, 4)),      # Oct 28 - Nov 4
    "winter": ((12, 30), (1, 8)),        # Dec 30 - Jan 8
    "spring": ((3, 28), (4, 5)),         # Mar 28 - Apr 5
    "summer": ((5, 26), (8, 31)),        # May 26 - Aug 31
}


def is_weekend(d: date) -> bool:
    """Check if date is weekend (Saturday or Sunday)."""
    return d.weekday() >= 5


def is_holiday(d: date) -> bool:
    """Check if date is a public holiday."""
    return (d.month, d.day) in FIXED_HOLIDAYS


def is_school_holiday(d: date) -> bool:
    """Check if date is a school holiday."""
    for season, ((start_m, start_d), (end_m, end_d)) in SCHOOL_HOLIDAYS.items():
        start = date(d.year, start_m, start_d)
        end = date(d.year, end_m, end_d)
        if start <= d <= end:
            return True
    return False


def get_day_type(d: date) -> str:
    """Get day type: weekday, weekend, holiday, school_holiday."""
    if is_holiday(d):
        return "holiday"
    if is_school_holiday(d):
        return "school_holiday"
    if is_weekend(d):
        return "weekend"
    return "weekday"


def generate_calendar_2026() -> List[Dict]:
    """Generate production calendar for 2026."""
    return _generate_calendar(2026)


def generate_calendar_2027() -> List[Dict]:
    """Generate production calendar for 2027."""
    return _generate_calendar(2027)


def _generate_calendar(year: int) -> List[Dict]:
    """Generate production calendar for a given year."""
    calendar = []
    d = date(year, 1, 1)
    end = date(year, 12, 31)

    while d <= end:
        day_type = get_day_type(d)
        holiday_name = FIXED_HOLIDAYS.get((d.month, d.day))

        calendar.append({
            "date": d.isoformat(),
            "day_type": day_type,
            "is_working": day_type == "weekday",
            "holiday_name": holiday_name,
            "is_school_holiday": is_school_holiday(d),
        })
        d += timedelta(days=1)

    return calendar


def get_calendar_as_dict(calendar: List[Dict]) -> Dict[str, Dict]:
    """Convert calendar list to dict keyed by date."""
    return {entry["date"]: entry for entry in calendar}


if __name__ == "__main__":
    # Generate and print calendar for 2026 and 2027
    for year in [2026, 2027]:
        cal = _generate_calendar(year)
        print(f"Calendar for {year}: {len(cal)} days")
        holidays = [d for d in cal if d["day_type"] == "holiday"]
        print(f"  Holidays: {len(holidays)}")
        for h in holidays:
            print(f"    {h['date']}: {h['holiday_name']}")
