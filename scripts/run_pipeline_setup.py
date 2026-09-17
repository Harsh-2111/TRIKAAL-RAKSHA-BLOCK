"""Run and validate the complete Day 1 RAKSHA-BLOCK data setup."""

from __future__ import annotations

import csv
import math
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data" / "synthetic"
ENV_FILE = ROOT_DIR / ".env"
SCHEMA_FILE = ROOT_DIR / "supabase" / "schema.sql"

DATASETS = {
    "corridor_capacity.csv": {"min_rows": 0, "key_columns": []},
    "trains_master.csv": {"min_rows": 250, "key_columns": ["train_no"]},
    "section_timetable.csv": {"min_rows": 500, "key_columns": []},
    "defects.csv": {"min_rows": 350, "key_columns": ["defect_id", "calculated_risk_score"]},
}


@dataclass
class DatasetReport:
    filename: str
    rows: int
    size_bytes: int
    valid: bool
    reason: str = ""


def run_setup_step(script_name: str) -> bool:
    command = [sys.executable, str(ROOT_DIR / "scripts" / script_name)]
    print(f"\n>>> Running {script_name}")
    try:
        result = subprocess.run(command, cwd=ROOT_DIR, text=True, capture_output=True)
    except OSError as exc:
        print(f"ERROR: Could not start {script_name}: {exc}")
        return False

    output = (result.stdout or "") + (result.stderr or "")
    if output:
        print(output.rstrip())
    if result.returncode != 0:
        print(f"ERROR: {script_name} exited with code {result.returncode}")
        return False
    print(f"OK: {script_name} completed")
    return True


def has_nan(value: str) -> bool:
    if value.strip().lower() in {"", "nan", "null", "none"}:
        return value.strip().lower() in {"", "nan"}
    try:
        return math.isnan(float(value))
    except ValueError:
        return False


def validate_dataset(filename: str, config: dict[str, object]) -> DatasetReport:
    path = DATA_DIR / filename
    if not path.exists():
        return DatasetReport(filename, 0, 0, False, "file is missing")

    try:
        with path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
    except (OSError, csv.Error) as exc:
        return DatasetReport(filename, 0, path.stat().st_size, False, f"could not read CSV: {exc}")

    minimum = int(config["min_rows"])
    if len(rows) < minimum:
        return DatasetReport(filename, len(rows), path.stat().st_size, False, f"requires at least {minimum} rows")

    key_columns = config["key_columns"]
    missing_columns = [column for column in key_columns if column not in (reader.fieldnames or [])]
    if missing_columns:
        return DatasetReport(filename, len(rows), path.stat().st_size, False, f"missing columns: {', '.join(missing_columns)}")

    invalid_values = [
        column
        for column in key_columns
        if any(has_nan(str(row.get(column, ""))) for row in rows)
    ]
    if invalid_values:
        return DatasetReport(filename, len(rows), path.stat().st_size, False, f"NaN/blank values in: {', '.join(invalid_values)}")

    return DatasetReport(filename, len(rows), path.stat().st_size, True)


def validate_environment() -> tuple[bool, str]:
    required_files = [ENV_FILE, SCHEMA_FILE]
    missing = [str(path.relative_to(ROOT_DIR)) for path in required_files if not path.exists()]
    if missing:
        return False, f"missing {', '.join(missing)}"

    env_values: dict[str, str] = {}
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            env_values[key.strip()] = value.strip().strip('"').strip("'")

    missing_values = [
        key for key in ("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")
        if not env_values.get(key) and not os.environ.get(key)
    ]
    if missing_values:
        return False, f"missing environment values: {', '.join(missing_values)}"
    return True, "ready for Day 2 ML training"


def print_report(reports: list[DatasetReport], environment_ok: bool, environment_message: str, steps_ok: bool) -> None:
    total_size = sum(report.size_bytes for report in reports)
    validation_ok = steps_ok and environment_ok and all(report.valid for report in reports)
    print("\n" + "=" * 72)
    print("RAKSHA-BLOCK DAY 1 PIPELINE SETUP REPORT")
    print("=" * 72)
    print(f"{'Dataset':<28} {'Rows':>8} {'Size':>12} {'Status':>10}")
    print("-" * 72)
    for report in reports:
        status = "PASS" if report.valid else "FAIL"
        print(f"{report.filename:<28} {report.rows:>8,} {report.size_bytes:>9,} B {status:>10}")
        if report.reason:
            print(f"  Reason: {report.reason}")
    print("-" * 72)
    print(f"{'Total generated data':<28} {'':>8} {total_size:>9,} B")
    print(f"Environment validation: {'PASS' if environment_ok else 'FAIL'} ({environment_message})")
    print(f"Day 2 ML training status: {'READY' if validation_ok else 'BLOCKED'}")
    print("=" * 72)


def main() -> int:
    generation_ok = run_setup_step("generate_dataset.py")
    sync_ok = run_setup_step("sync_supabase.py")
    reports = [validate_dataset(filename, config) for filename, config in DATASETS.items()]
    environment_ok, environment_message = validate_environment()
    print_report(reports, environment_ok, environment_message, generation_ok and sync_ok)
    return 0 if generation_ok and sync_ok and environment_ok and all(report.valid for report in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())