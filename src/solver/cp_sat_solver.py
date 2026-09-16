"""Constraint optimization for RAKSHA-BLOCK maintenance defects.

The public ``solve_schedule`` function accepts plain dictionaries so it can be
called from an API handler, a notebook, or the command line. All time values
are integer minutes from midnight in the range 00:00 through 24:00.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from ortools.sat.python import cp_model


DAY_MINUTES = 24 * 60
SAFETY_BUFFER_MINUTES = 15
OBJECTIVE_SCALE = 100
CAPACITY_LOSS_RATE = 0.01
DEFAULT_TIME_LIMIT_SECONDS = 10.0


@dataclass(frozen=True)
class DefectPriority:
    defect_id: str
    section: str
    department: str
    calculated_risk_score: float
    required_duration_mins: int


@dataclass(frozen=True)
class SectionParameters:
    max_daily_block_mins: int
    tracks_count: int


@dataclass(frozen=True)
class PremiumTrainWindow:
    start_minute: int
    end_minute: int
    train_no: str = ""
    train_name: str = ""


def _as_int(value: Any, field: str, minimum: int = 0) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer") from exc
    if parsed < minimum:
        raise ValueError(f"{field} must be at least {minimum}")
    return parsed


def _as_float(value: Any, field: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be numeric") from exc
    if parsed < 0:
        raise ValueError(f"{field} must not be negative")
    return parsed


def _parse_defect(raw: Mapping[str, Any]) -> DefectPriority:
    defect_id = str(raw.get("defect_id", "")).strip()
    section = str(raw.get("section", "")).strip()
    if not defect_id or not section:
        raise ValueError("Each defect requires defect_id and section")
    duration = _as_int(raw.get("required_duration_mins"), "required_duration_mins", 1)
    if duration > DAY_MINUTES:
        raise ValueError(f"Defect {defect_id} duration exceeds one day")
    return DefectPriority(
        defect_id=defect_id,
        section=section,
        department=str(raw.get("department", "")).strip(),
        calculated_risk_score=_as_float(raw.get("calculated_risk_score"), "calculated_risk_score"),
        required_duration_mins=duration,
    )


def _parse_sections(raw: Mapping[str, Any]) -> dict[str, SectionParameters]:
    sections: dict[str, SectionParameters] = {}
    for section, values in raw.items():
        if not isinstance(values, Mapping):
            raise ValueError(f"Section parameters for {section} must be an object")
        max_minutes = _as_int(values.get("max_daily_block_mins"), f"{section}.max_daily_block_mins")
        tracks = _as_int(values.get("tracks_count"), f"{section}.tracks_count", 1)
        if max_minutes > DAY_MINUTES:
            raise ValueError(f"{section}.max_daily_block_mins cannot exceed 1440")
        sections[str(section)] = SectionParameters(max_minutes, tracks)
    return sections


def _clock_minute(value: Any, field: str) -> int:
    if isinstance(value, (int, float)):
        minute = int(value)
    else:
        text = str(value).strip()
        try:
            hour_text, minute_text = text.split(":", 1)
            minute = int(hour_text) * 60 + int(minute_text)
        except (ValueError, TypeError) as exc:
            raise ValueError(f"{field} must be HH:MM or minutes from midnight") from exc
    if not 0 <= minute <= DAY_MINUTES:
        raise ValueError(f"{field} must be between 00:00 and 24:00")
    return minute


def _parse_windows(raw: Mapping[str, Any]) -> dict[str, list[PremiumTrainWindow]]:
    windows_by_section: dict[str, list[PremiumTrainWindow]] = {}
    for section, values in raw.items():
        if not isinstance(values, Sequence) or isinstance(values, (str, bytes)):
            raise ValueError(f"Premium windows for {section} must be a list")
        windows_by_section[str(section)] = []
        for index, value in enumerate(values):
            if not isinstance(value, Mapping):
                raise ValueError(f"Premium window {section}[{index}] must be an object")
            start = _clock_minute(value.get("start", value.get("start_time")), f"{section}[{index}].start")
            end = _clock_minute(value.get("end", value.get("end_time")), f"{section}[{index}].end")
            if end <= start:
                raise ValueError(f"Premium window {section}[{index}] must not cross midnight")
            windows_by_section[str(section)].append(
                PremiumTrainWindow(
                    start_minute=start,
                    end_minute=end,
                    train_no=str(value.get("train_no", "")),
                    train_name=str(value.get("train_name", "")),
                )
            )
    return windows_by_section


def _minutes_to_time(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


def _status_name(status: cp_model.CpSolverStatus) -> str:
    return {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
        cp_model.UNKNOWN: "UNKNOWN",
    }.get(status, "UNKNOWN")


def solve_schedule(
    defect_priorities: Sequence[Mapping[str, Any]],
    section_parameters: Mapping[str, Mapping[str, Any]],
    timetable_parameters: Mapping[str, Sequence[Mapping[str, Any]]],
    time_limit_seconds: float = DEFAULT_TIME_LIMIT_SECONDS,
    available_time_windows: Mapping[str, Sequence[Mapping[str, Any]]] | None = None,
    penalty_weights: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Solve the daily maintenance schedule and return JSON-serializable data."""
    if time_limit_seconds <= 0:
        raise ValueError("time_limit_seconds must be greater than zero")

    defects = [_parse_defect(item) for item in defect_priorities]
    sections = _parse_sections(section_parameters)
    premium_windows = _parse_windows(timetable_parameters.get("premium_train_windows", timetable_parameters))
    available_windows = _parse_windows(available_time_windows or {})
    weights = penalty_weights or {}
    capacity_loss_rate = _as_float(weights.get("capacity_loss", CAPACITY_LOSS_RATE), "capacity_loss")
    train_detention_rate = _as_float(weights.get("train_detention", 0), "train_detention")
    missing_sections = sorted({defect.section for defect in defects} - sections.keys())
    if missing_sections:
        raise ValueError(f"Missing section parameters: {', '.join(missing_sections)}")
    if len({defect.defect_id for defect in defects}) != len(defects):
        raise ValueError("defect_id values must be unique")

    model = cp_model.CpModel()
    starts: list[cp_model.IntVar] = []
    ends: list[cp_model.IntVar] = []
    tracks: list[cp_model.IntVar] = []
    selected: list[cp_model.BoolVar] = []
    intervals: list[cp_model.IntervalVar] = []

    for index, defect in enumerate(defects):
        section = sections[defect.section]
        selected_var = model.NewBoolVar(f"scheduled_{index}")
        start_var = model.NewIntVar(0, DAY_MINUTES - defect.required_duration_mins, f"start_{index}")
        end_var = model.NewIntVar(defect.required_duration_mins, DAY_MINUTES, f"end_{index}")
        track_var = model.NewIntVar(0, section.tracks_count - 1, f"track_{index}")
        interval_var = model.NewOptionalIntervalVar(
            start_var,
            defect.required_duration_mins,
            end_var,
            selected_var,
            f"maintenance_{index}",
        )
        model.Add(end_var == start_var + defect.required_duration_mins).OnlyEnforceIf(selected_var)
        starts.append(start_var)
        ends.append(end_var)
        tracks.append(track_var)
        selected.append(selected_var)
        intervals.append(interval_var)

    defects_by_section: dict[str, list[int]] = {}
    for index, defect in enumerate(defects):
        defects_by_section.setdefault(defect.section, []).append(index)

    for section_name, indices in defects_by_section.items():
        section = sections[section_name]
        model.Add(
            sum(defects[index].required_duration_mins * selected[index] for index in indices)
            <= section.max_daily_block_mins
        )
        model.AddNoOverlap([intervals[index] for index in indices])

        # A pair is ordered in time whenever both jobs are selected. Jobs on
        # different tracks additionally carry the mandatory 15-minute buffer.
        for position, left_index in enumerate(indices):
            for right_index in indices[position + 1 :]:
                both_selected = [selected[left_index], selected[right_index]]
                same_track = model.NewBoolVar(f"same_track_{left_index}_{right_index}")
                before_left = model.NewBoolVar(f"before_{left_index}_{right_index}")
                before_right = model.NewBoolVar(f"before_{right_index}_{left_index}")
                model.Add(tracks[left_index] == tracks[right_index]).OnlyEnforceIf(same_track)
                model.Add(tracks[left_index] != tracks[right_index]).OnlyEnforceIf(same_track.Not())
                model.AddBoolOr([before_left, before_right, selected[left_index].Not(), selected[right_index].Not()])
                model.Add(starts[left_index] >= ends[right_index]).OnlyEnforceIf(
                    [before_left, *both_selected, same_track]
                )
                model.Add(starts[right_index] >= ends[left_index]).OnlyEnforceIf(
                    [before_right, *both_selected, same_track]
                )
                model.Add(starts[left_index] >= ends[right_index] + SAFETY_BUFFER_MINUTES).OnlyEnforceIf(
                    [before_left, *both_selected, same_track.Not()]
                )
                model.Add(starts[right_index] >= ends[left_index] + SAFETY_BUFFER_MINUTES).OnlyEnforceIf(
                    [before_right, *both_selected, same_track.Not()]
                )

        for index in indices:
            allowed = available_windows.get(section_name, [])
            if allowed:
                allowed_window_flags = []
                for window_index, window in enumerate(allowed):
                    fits_window = model.NewBoolVar(f"fits_window_{index}_{window_index}")
                    allowed_window_flags.append(fits_window)
                    model.Add(starts[index] >= window.start_minute).OnlyEnforceIf(fits_window)
                    model.Add(ends[index] <= window.end_minute).OnlyEnforceIf(fits_window)
                model.AddBoolOr([*allowed_window_flags, selected[index].Not()])
            for window_index, window in enumerate(premium_windows.get(section_name, [])):
                before_window = model.NewBoolVar(f"before_premium_{index}_{window_index}")
                after_window = model.NewBoolVar(f"after_premium_{index}_{window_index}")
                model.AddBoolOr([before_window, after_window, selected[index].Not()])
                model.Add(ends[index] <= window.start_minute).OnlyEnforceIf([before_window, selected[index]])
                model.Add(starts[index] >= window.end_minute).OnlyEnforceIf([after_window, selected[index]])

    risk_reward = []
    for index, defect in enumerate(defects):
        reward = int(round(defect.calculated_risk_score * defect.required_duration_mins * OBJECTIVE_SCALE))
        capacity_penalty = int(round(defect.required_duration_mins * capacity_loss_rate * OBJECTIVE_SCALE))
        detention_penalty = int(round(defect.required_duration_mins * train_detention_rate * OBJECTIVE_SCALE))
        risk_reward.append((reward - capacity_penalty - detention_penalty) * selected[index])
    model.Maximize(sum(risk_reward))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 8
    solver.parameters.log_search_progress = False
    status = solver.Solve(model)
    status_name = _status_name(status)

    scheduled_blocks: list[dict[str, Any]] = []
    total_risk = 0.0
    train_detention_cost = 0.0
    capacity_loss_penalty = 0.0
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for index, defect in enumerate(defects):
            if not solver.BooleanValue(selected[index]):
                continue
            start = solver.Value(starts[index])
            end = solver.Value(ends[index])
            total_risk += defect.calculated_risk_score * defect.required_duration_mins
            capacity_loss_penalty += defect.required_duration_mins * capacity_loss_rate
            scheduled_blocks.append(
                {
                    "defect_id": defect.defect_id,
                    "section": defect.section,
                    "department": defect.department,
                    "track": solver.Value(tracks[index]) + 1,
                    "start_minute": start,
                    "end_minute": end,
                    "start_time": _minutes_to_time(start),
                    "end_time": _minutes_to_time(end),
                    "duration_mins": defect.required_duration_mins,
                    "calculated_risk_score": defect.calculated_risk_score,
                }
                    )
        scheduled_blocks.sort(key=lambda block: (block["section"], block["start_minute"], block["track"]))
    else:
        scheduled_blocks = []

    scheduled_ids = {block["defect_id"] for block in scheduled_blocks}
    return {
        "solver_status": status_name,
        "time_limit_seconds": time_limit_seconds,
        "scheduled_blocks": scheduled_blocks,
        "unscheduled_defect_ids": [defect.defect_id for defect in defects if defect.defect_id not in scheduled_ids],
        "total_risk_mitigated": round(total_risk, 2),
        "train_detention_cost": round(train_detention_cost, 2),
        "capacity_loss_penalty": round(capacity_loss_penalty, 2),
        "objective_value": round(solver.ObjectiveValue() / OBJECTIVE_SCALE, 2) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0.0,
        "scheduled_count": len(scheduled_blocks),
        "input_count": len(defects),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", help="JSON file, or stdin when omitted")
    args = parser.parse_args()
    try:
        payload = json.loads(
            Path(args.input).read_text(encoding="utf-8") if args.input else sys.stdin.read()
        )
        result = solve_schedule(
            payload["defect_priorities"],
            payload["section_parameters"],
            payload["timetable_parameters"],
            available_time_windows=payload.get("available_time_windows"),
            penalty_weights=payload.get("penalty_weights"),
        )
        print(json.dumps(result, indent=2))
        return 0 if result["solver_status"] in {"OPTIMAL", "FEASIBLE"} else 1
    except Exception as exc:
        print(json.dumps({"solver_status": "ERROR", "error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())