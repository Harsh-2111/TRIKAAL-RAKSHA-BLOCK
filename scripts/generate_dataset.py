"""Generate deterministic synthetic datasets for the RAKSHA-BLOCK system.

The generated CSVs are deliberately self-contained and use only the Python
standard library so they can be regenerated in CI or on an analyst laptop.
"""

from __future__ import annotations

import csv
import random
from pathlib import Path
from typing import Iterable


SEED = 42
ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "data" / "synthetic"

SECTIONS = [
    "NDLS-GZB",
    "GZB-ALJN",
    "NDLS-PWL",
    "PWL-MTJ",
    "DLI-DEC",
    "DEC-GGN",
    "NZM-FDB",
    "GZB-MTC",
    "PNP-UMB",
    "VAPI-ST",
]

# Each pair represents adjacent sections in one of the main Delhi Division
# flows. Every generated train traverses one pair, yielding 500 timetable rows.
ROUTE_PAIRS = [
    ("NDLS-GZB", "GZB-ALJN"),
    ("NDLS-PWL", "PWL-MTJ"),
    ("DLI-DEC", "DEC-GGN"),
    ("NZM-FDB", "NDLS-PWL"),
    ("GZB-MTC", "GZB-ALJN"),
    ("PNP-UMB", "GZB-ALJN"),
    ("VAPI-ST", "GZB-MTC"),
]

TRAIN_PROFILES = (
    ("Rajdhani Express", 1, (90, 99), (1200, 1600)),
    ("Shatabdi Express", 1, (90, 99), (1200, 1600)),
    ("Superfast Express", 2, (80, 92), (1400, 2200)),
    ("Express Passenger", 3, (70, 85), (1000, 1800)),
    ("Goods Freight", 4, (55, 75), (0, 0)),
)


def write_csv(filename: str, fieldnames: list[str], rows: Iterable[dict[str, object]]) -> int:
    """Write rows with stable column ordering and return the number written."""
    path = OUTPUT_DIR / filename
    row_count = 0
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            row_count += 1
    print(f"Generated {path.relative_to(ROOT_DIR)} ({row_count:,} rows)")
    return row_count


def random_time(rng: random.Random) -> int:
    """Return a departure minute, spread across a full 24-hour operating day."""
    return rng.randrange(0, 24 * 60, 5)


def format_time(minutes: int) -> str:
    minutes %= 24 * 60
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def random_days(rng: random.Random) -> str:
    day_names = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    run_days = rng.sample(day_names, rng.choice([5, 6, 7]))
    return ",".join(day for day in day_names if day in run_days)


def generate_capacity(rng: random.Random) -> None:
    rows = []
    for section in SECTIONS:
        tracks = rng.randint(2, 4)
        line_type = {2: "DOUBLE", 3: "TRIPLE", 4: "QUADRUPLE"}[tracks]
        daily_count = rng.randint(80, 240)
        if daily_count > 180:
            tier = "Tier-1 (Ultra High Density)"
        elif daily_count > 120:
            tier = "Tier-2 (High Density)"
        else:
            tier = "Tier-3 (Medium Density)"
        capacity = round((daily_count / 18) * (0.92 + rng.random() * 0.16), 1)
        rows.append(
            {
                "section": section,
                "total_tracks": tracks,
                "line_type": line_type,
                "daily_train_count": daily_count,
                "criticality_tier": tier,
                "max_hourly_capacity": capacity,
            }
        )

    write_csv(
        "corridor_capacity.csv",
        [
            "section",
            "total_tracks",
            "line_type",
            "daily_train_count",
            "criticality_tier",
            "max_hourly_capacity",
        ],
        rows,
    )


def generate_trains(rng: random.Random) -> list[dict[str, object]]:
    rows = []
    used_numbers: set[str] = set()
    for index in range(250):
        train_name, priority, punctuality_range, passenger_range = rng.choice(TRAIN_PROFILES)
        prefix = rng.choice(["12", "22", "04"])
        train_no = f"{prefix}{rng.randint(0, 999):03d}"
        while train_no in used_numbers:
            train_no = f"{prefix}{rng.randint(0, 999):03d}"
        used_numbers.add(train_no)

        rows.append(
            {
                "train_no": train_no,
                "train_name": f"{train_name} {index + 1:03d}",
                "type": train_name,
                "priority_class": priority,
                "days_of_run": random_days(rng),
                "punctuality_pct": round(rng.uniform(*punctuality_range), 1),
                "avg_passengers": rng.randint(*passenger_range),
            }
        )

    write_csv(
        "trains_master.csv",
        [
            "train_no",
            "train_name",
            "type",
            "priority_class",
            "days_of_run",
            "punctuality_pct",
            "avg_passengers",
        ],
        rows,
    )
    return rows


def generate_timetable(rng: random.Random, trains: list[dict[str, object]]) -> None:
    rows = []
    for train in trains:
        first_section, second_section = rng.choice(ROUTE_PAIRS)
        direction = rng.choice(["UP", "DOWN"])
        first_arrival = random_time(rng)
        first_departure = first_arrival + rng.randint(3, 8)
        second_arrival = first_departure + rng.randint(25, 60)
        second_departure = second_arrival + rng.randint(3, 8)
        for section, arrival, departure in (
            (first_section, first_arrival, first_departure),
            (second_section, second_arrival, second_departure),
        ):
            rows.append(
                {
                    "train_no": train["train_no"],
                    "section": section,
                    "arr_time": format_time(arrival),
                    "dep_time": format_time(departure),
                    "direction": direction,
                    "days": train["days_of_run"],
                }
            )

    write_csv(
        "section_timetable.csv",
        ["train_no", "section", "arr_time", "dep_time", "direction", "days"],
        rows,
    )


def weighted_severity(rng: random.Random) -> int:
    return rng.choices([1, 2, 3, 4, 5], weights=[25, 25, 20, 20, 10], k=1)[0]


def generate_defects(rng: random.Random) -> None:
    department_sources = {
        "Engineering": "TMS",
        "S & T": "SMMS",
        "TRD": "TDMS",
    }
    rows = []
    for index in range(350):
        department = rng.choices(
            list(department_sources), weights=[50, 25, 25], k=1
        )[0]
        severity = weighted_severity(rng)
        days_overdue = rng.choices([rng.randint(0, 30), rng.randint(31, 180)], weights=[70, 30], k=1)[0]
        asset_age = round(rng.uniform(2.0, 45.0), 1)
        past_failures = rng.randint(0, 8)
        deferred = rng.randint(0, 6)
        risk_score = min(
            100.0,
            max(
                5.0,
                (severity * 12.0)
                + (days_overdue * 0.6)
                + (past_failures * 5.5)
                + (deferred * 7.5)
                + (asset_age * 0.4),
            ),
        )
        rows.append(
            {
                "defect_id": f"DEF-2026-{index + 1:04d}",
                "source_system": department_sources[department],
                "department": department,
                "section": rng.choice(SECTIONS),
                "severity": severity,
                "days_overdue": days_overdue,
                "asset_age_years": asset_age,
                "past_failure_count": past_failures,
                "deferred_count": deferred,
                "calculated_risk_score": round(risk_score, 1),
            }
        )

    write_csv(
        "defects.csv",
        [
            "defect_id",
            "source_system",
            "department",
            "section",
            "severity",
            "days_overdue",
            "asset_age_years",
            "past_failure_count",
            "deferred_count",
            "calculated_risk_score",
        ],
        rows,
    )


def main() -> None:
    rng = random.Random(SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating deterministic RAKSHA-BLOCK datasets with seed {SEED}...")
    generate_capacity(rng)
    trains = generate_trains(rng)
    generate_timetable(rng, trains)
    generate_defects(rng)
    print(f"Dataset generation complete: {OUTPUT_DIR.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()