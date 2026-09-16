"""Verify the Day 3 CP-SAT optimization engine and HTTP API."""

from __future__ import annotations

import csv
import sys
import time
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFECTS_PATH = ROOT_DIR / "data" / "synthetic" / "defects.csv"
TARGET_SECTIONS = ("NDLS-GZB", "NDLS-PWL")
PREMIUM_WINDOWS = [
    {
        "section": section,
        "start_time_hhmm": "08:00",
        "end_time_hhmm": "09:00",
        "train_no": "12301",
        "train_name": "Rajdhani Express",
    }
    for section in TARGET_SECTIONS
] + [
    {
        "section": section,
        "start_time_hhmm": "18:00",
        "end_time_hhmm": "19:00",
        "train_no": "12001",
        "train_name": "Shatabdi Express",
    }
    for section in TARGET_SECTIONS
]


def load_day2_priorities() -> list[dict[str, Any]]:
    if not DEFECTS_PATH.exists():
        raise FileNotFoundError(f"Missing Day 2 defect data: {DEFECTS_PATH}")
    with DEFECTS_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    selected = [row for row in rows if row.get("section") in TARGET_SECTIONS]
    if len(selected) < 20:
        raise ValueError(f"Expected at least 20 defects in {TARGET_SECTIONS}, found {len(selected)}")

    priorities = []
    for index, row in enumerate(selected[:24], start=1):
        priorities.append({
            "defect_id": row["defect_id"],
            "section": row["section"],
            "department": row["department"],
            "calculated_risk_score": float(row["calculated_risk_score"]),
            "required_duration_mins": 30 + (index % 4) * 10,
        })
    return priorities


def minutes(value: str) -> int:
    hours, mins = value.split(":", 1)
    return int(hours) * 60 + int(mins)


def assert_constraints(blocks: list[dict[str, Any]]) -> None:
    premium_by_section = {}
    for window in PREMIUM_WINDOWS:
        premium_by_section.setdefault(window["section"], []).append(window)

    for block in blocks:
        start = minutes(block["start_time"] if "start_time" in block else block["start_time_hhmm"])
        end = minutes(block["end_time"] if "end_time" in block else block["end_time_hhmm"])
        for window in premium_by_section.get(block["section"], []):
            premium_start = minutes(window["start_time_hhmm"])
            premium_end = minutes(window["end_time_hhmm"])
            assert max(start, premium_start) >= min(end, premium_end), (
                f"{block['defect_id']} overlaps {window['train_name']} on {block['section']}"
            )

    ordered = sorted(blocks, key=lambda block: (block["section"], minutes(block.get("start_time", block.get("start_time_hhmm")))))
    for left, right in zip(ordered, ordered[1:]):
        if left["section"] != right["section"]:
            continue
        left_end = minutes(left.get("end_time", left.get("end_time_hhmm")))
        right_start = minutes(right.get("start_time", right.get("start_time_hhmm")))
        assert right_start >= left_end, f"Single-track overlap: {left['defect_id']} and {right['defect_id']}"


def build_api_payload(priorities: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "defects": priorities,
        "available_time_windows": [
            {"section": section, "start_time_hhmm": "00:00", "end_time_hhmm": "24:00"}
            for section in TARGET_SECTIONS
        ],
        "section_capacity_limits": {
            section: {"max_daily_block_mins": 1440, "tracks_count": 1}
            for section in TARGET_SECTIONS
        },
        "premium_train_windows": PREMIUM_WINDOWS,
        "penalty_weights": {"train_detention": 1.0, "capacity_loss": 0.01},
    }


def main() -> int:
    started = time.perf_counter()
    try:
        if str(ROOT_DIR) not in sys.path:
            sys.path.insert(0, str(ROOT_DIR))
        from src.solver.cp_sat_solver import solve_schedule
        from src.solver.solver_api import app

        priorities = load_day2_priorities()
        api_payload = build_api_payload(priorities)
        section_parameters = api_payload["section_capacity_limits"]
        timetable_parameters = {"premium_train_windows": {
            section: [
                {
                    "start": window["start_time_hhmm"],
                    "end": window["end_time_hhmm"],
                    "train_no": window["train_no"],
                    "train_name": window["train_name"],
                }
                for window in PREMIUM_WINDOWS
                if window["section"] == section
            ]
            for section in TARGET_SECTIONS
        }}

        solver_started = time.perf_counter()
        direct_result = solve_schedule(
            priorities,
            section_parameters,
            timetable_parameters,
            time_limit_seconds=10.0,
            available_time_windows={
                section: [{"start": "00:00", "end": "24:00"}]
                for section in TARGET_SECTIONS
            },
            penalty_weights=api_payload["penalty_weights"],
        )
        direct_ms = (time.perf_counter() - solver_started) * 1000
        assert direct_result["solver_status"] in {"OPTIMAL", "FEASIBLE"}, direct_result
        assert direct_result["input_count"] >= 20
        assert direct_result["total_risk_mitigated"] >= 0
        assert_constraints(direct_result["scheduled_blocks"])

        client = TestClient(app)
        api_response = client.post("/solver/optimize", json=api_payload)
        assert api_response.status_code == 200, api_response.text
        api_result = api_response.json()
        assert api_result["solver_status"] in {"OPTIMAL", "FEASIBLE_HEURISTIC"}
        assert api_result["schedule_blocks"]
        assert api_result["execution_time_ms"] >= 0
        assert_constraints(api_result["schedule_blocks"])

        total_ms = (time.perf_counter() - started) * 1000
        print("\n" + "=" * 72)
        print("RAKSHA-BLOCK DAY 3 CP-SAT VERIFICATION")
        print("=" * 72)
        print(f"Day 2 ML priority defects: {len(priorities)}")
        print(f"Sections verified: {', '.join(TARGET_SECTIONS)}")
        print(f"Direct solver status: {direct_result['solver_status']}")
        print(f"API solver status: {api_result['solver_status']}")
        print(f"Direct solver execution: {direct_ms:.2f} ms")
        print(f"End-to-end verification time: {total_ms:.2f} ms")
        print(f"Total risk mitigated: {direct_result['total_risk_mitigated']:.2f}")
        print("Rajdhani/Shatabdi protection: PASS")
        print("Single-track overlap validation: PASS")
        print("Day 4 Frontend Gantt & Impact Dashboard readiness: READY")
        print("=" * 72)
        return 0
    except Exception as exc:
        print("\nRAKSHA-BLOCK DAY 3 CP-SAT VERIFICATION: FAILED", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())