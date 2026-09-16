"""Seed Supabase with the deterministic RAKSHA-BLOCK synthetic datasets.

The command is intentionally non-fatal for analyst laptops and CI jobs where
Supabase credentials, network access, or the optional client package are not
available. In those cases it still reads and validates every local CSV and
reports the rows that would have been uploaded.
"""

from __future__ import annotations

import argparse
import csv
import logging
import os
from pathlib import Path
from typing import Any


LOGGER = logging.getLogger("raksha_block.sync_supabase")
ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data" / "synthetic"
DEFAULT_ENV_PATH = ROOT_DIR / ".env"

SUPABASE_URL = "https://rywnmfynpenbwfbzqxyg.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5d25tZnlucGVuYmZicXp5eHlnIiw"
    "icm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzYxMzAsImV4cCI6MjEwNDYxMjEzMH0."
    "KSy4uyXv-YUC_yxXivUDdDG6Aws8I8OK5kNyu2yf6LA"
)

TABLE_CONFIG = (
    ("corridor_capacity.csv", "corridor_capacity", "section"),
    ("trains_master.csv", "trains_master", "train_no"),
    ("section_timetable.csv", "section_timetable", "id"),
    ("defects.csv", "defects", "defect_id"),
)


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def ensure_env_file(path: Path) -> dict[str, str]:
    """Create or complete .env without overwriting existing values."""
    defaults = {
        "VITE_SUPABASE_URL": SUPABASE_URL,
        "VITE_SUPABASE_ANON_KEY": SUPABASE_ANON_KEY,
    }
    existing = parse_env_file(path)
    missing = [key for key, value in defaults.items() if not existing.get(key)]
    if missing:
        with path.open("a", encoding="utf-8") as handle:
            if path.exists() and path.stat().st_size > 0:
                handle.write("\n")
            handle.write("# RAKSHA-BLOCK Supabase configuration\n")
            for key in missing:
                handle.write(f'{key}="{defaults[key]}"\n')
        LOGGER.info("Configured missing Supabase variables in %s", path)
        existing.update({key: defaults[key] for key in missing})
    elif not path.exists():
        path.write_text(
            "# RAKSHA-BLOCK Supabase configuration\n"
            f'VITE_SUPABASE_URL="{defaults["VITE_SUPABASE_URL"]}"\n'
            f'VITE_SUPABASE_ANON_KEY="{defaults["VITE_SUPABASE_ANON_KEY"]}"\n',
            encoding="utf-8",
        )
        existing.update(defaults)
        LOGGER.info("Created local environment file at %s", path)

    for key, value in existing.items():
        os.environ.setdefault(key, value)
    return existing


def read_datasets() -> dict[str, list[dict[str, Any]]]:
    datasets: dict[str, list[dict[str, Any]]] = {}
    for filename, table, _ in TABLE_CONFIG:
        path = DATA_DIR / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing local dataset: {path}")
        with path.open(newline="", encoding="utf-8") as handle:
            datasets[table] = list(csv.DictReader(handle))
        LOGGER.info("Loaded %s rows from %s", len(datasets[table]), path)
    return datasets


def integer(value: str) -> int:
    return int(round(float(value)))


def numeric_rows(table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert CSV strings to values accepted by the schema."""
    converted = [dict(row) for row in rows]
    if table == "corridor_capacity":
        for row in converted:
            row["total_tracks"] = integer(row["total_tracks"])
            row["daily_train_count"] = integer(row["daily_train_count"])
            row["max_hourly_capacity"] = integer(row["max_hourly_capacity"])
    elif table == "trains_master":
        for row in converted:
            row["priority_class"] = integer(row["priority_class"])
            row["punctuality_pct"] = float(row["punctuality_pct"])
            row["avg_passengers"] = integer(row["avg_passengers"])
    elif table == "section_timetable":
        for index, row in enumerate(converted, start=1):
            row["id"] = index
    elif table == "defects":
        for row in converted:
            for field in ("severity", "days_overdue", "past_failure_count", "deferred_count"):
                row[field] = integer(row[field])
            row["asset_age_years"] = float(row["asset_age_years"])
            row["calculated_risk_score"] = float(row["calculated_risk_score"])
    return converted


def connect_supabase(env: dict[str, str]) -> Any | None:
    try:
        from supabase import create_client
    except ImportError as exc:
        LOGGER.warning(
            "supabase-py could not be imported (%s); local CSV validation will "
            "continue. Install dependencies with: pip install -r requirements.txt",
            exc,
        )
        return None

    try:
        return create_client(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"])
    except Exception as exc:  # Client libraries expose different exception types.
        LOGGER.warning("Could not initialize Supabase client: %s", exc)
        return None


def upsert_datasets(client: Any, datasets: dict[str, list[dict[str, Any]]], batch_size: int) -> bool:
    all_succeeded = True
    for _, table, conflict_key in TABLE_CONFIG:
        rows = numeric_rows(table, datasets[table])
        if not rows:
            LOGGER.info("Skipping %s because its local dataset is empty", table)
            continue
        try:
            for start in range(0, len(rows), batch_size):
                batch = rows[start : start + batch_size]
                client.table(table).upsert(batch, on_conflict=conflict_key).execute()
            LOGGER.info("Upserted %s rows into %s", len(rows), table)
        except Exception as exc:  # Continue with other tables for partial availability.
            all_succeeded = False
            LOGGER.warning(
                "Supabase upsert failed for %s (%s rows): %s. "
                "Local CSV data remains available.",
                table,
                len(rows),
                exc,
            )
    return all_succeeded


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-only", action="store_true", help="Read and validate CSVs without contacting Supabase")
    parser.add_argument("--batch-size", type=int, default=500, help="Rows per Supabase upsert request")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_PATH, help="Path to the local environment file")
    args = parser.parse_args()
    if args.batch_size <= 0:
        LOGGER.error("--batch-size must be greater than zero")
        return 0

    try:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
        env = ensure_env_file(args.env_file)
        datasets = read_datasets()
        for _, table, _ in TABLE_CONFIG:
            LOGGER.info("Local execution ready: %s has %s rows", table, len(datasets[table]))

        if args.local_only:
            LOGGER.info("Local-only mode requested; no Supabase calls were made")
            return 0

        client = connect_supabase(env)
        if client is None:
            LOGGER.warning("Continuing in local CSV mode; no rows were sent to Supabase")
            return 0

        if upsert_datasets(client, datasets, args.batch_size):
            LOGGER.info("Supabase synthetic dataset sync completed successfully")
        else:
            LOGGER.warning("Supabase sync completed with one or more table failures")
    except Exception as exc:
        LOGGER.exception("Local dataset execution could not complete: %s", exc)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())