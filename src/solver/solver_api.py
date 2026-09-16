"""HTTP API for the RAKSHA-BLOCK CP-SAT scheduling engine."""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .cp_sat_solver import solve_schedule


DAY_MINUTES = 1440
BUFFER_MINUTES = 15


class DefectInput(BaseModel):
    defect_id: str
    section: str
    department: str
    calculated_risk_score: float = Field(ge=0)
    required_duration_mins: int = Field(gt=0, le=DAY_MINUTES)


class TimeWindow(BaseModel):
    section: str
    start_time_hhmm: str
    end_time_hhmm: str


class PremiumTrainWindow(TimeWindow):
    train_no: str = ""
    train_name: str = ""


class SectionCapacityLimit(BaseModel):
    max_daily_block_mins: int = Field(ge=0, le=DAY_MINUTES)
    tracks_count: int = Field(gt=0)


class PenaltyWeights(BaseModel):
    train_detention: float = Field(default=0.0, ge=0)
    capacity_loss: float = Field(default=0.01, ge=0)


class SolverRequest(BaseModel):
    defects: list[DefectInput] = Field(min_length=1)
    available_time_windows: list[TimeWindow] = Field(default_factory=list)
    section_capacity_limits: dict[str, SectionCapacityLimit]
    premium_train_windows: list[PremiumTrainWindow] = Field(default_factory=list)
    penalty_weights: PenaltyWeights = Field(default_factory=PenaltyWeights)


class ScheduleBlock(BaseModel):
    defect_id: str
    section: str
    department: str
    start_time_hhmm: str
    end_time_hhmm: str
    duration_mins: int
    priority_rank: int


class SolverResponse(BaseModel):
    schedule_blocks: list[ScheduleBlock]
    total_risk_reduced: float
    estimated_train_delay_mins: float
    solver_status: str
    execution_time_ms: float


class ConflictBlock(BaseModel):
    defect_id: str
    section: str
    start_time_hhmm: str
    end_time_hhmm: str
    duration_mins: int


class ConflictSimulationRequest(BaseModel):
    maintenance_blocks: list[ConflictBlock] = Field(min_length=1)
    premium_train_windows: list[PremiumTrainWindow] = Field(default_factory=list)
    section_capacity_limits: dict[str, SectionCapacityLimit] = Field(default_factory=dict)


app = FastAPI(title="RAKSHA-BLOCK Solver API", version="1.0.0")


def minute(value: str) -> int:
    hours, minutes = value.split(":", 1)
    parsed = int(hours) * 60 + int(minutes)
    if not 0 <= parsed <= DAY_MINUTES:
        raise ValueError(f"Invalid HH:MM value: {value}")
    return parsed


def hhmm(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


def grouped_windows(windows: list[TimeWindow]) -> dict[str, list[dict[str, str]]]:
    return {
        section: [
            {"start": window.start_time_hhmm, "end": window.end_time_hhmm}
            for window in section_windows
        ]
        for section in {window.section for window in windows}
        for section_windows in [[item for item in windows if item.section == section]]
    }


def grouped_premium(windows: list[PremiumTrainWindow]) -> dict[str, list[dict[str, str]]]:
    return {
        section: [
            {
                "start": window.start_time_hhmm,
                "end": window.end_time_hhmm,
                "train_no": window.train_no,
                "train_name": window.train_name,
            }
            for window in section_windows
        ]
        for section in {window.section for window in windows}
        for section_windows in [[item for item in windows if item.section == section]]
    }


def overlap(start_a: int, end_a: int, start_b: int, end_b: int) -> int:
    return max(0, min(end_a, end_b) - max(start_a, start_b))


def fallback_schedule(request: SolverRequest) -> SolverResponse:
    started = time.perf_counter()
    windows = grouped_windows(request.available_time_windows)
    premium = grouped_premium(request.premium_train_windows)
    used: dict[str, list[tuple[int, int]]] = {}
    used_minutes: dict[str, int] = {}
    blocks: list[ScheduleBlock] = []
    ranked = sorted(request.defects, key=lambda defect: defect.calculated_risk_score, reverse=True)

    for rank, defect in enumerate(ranked, start=1):
        section_windows = windows.get(defect.section) or [{"start": "00:00", "end": "24:00"}]
        capacity = request.section_capacity_limits.get(defect.section)
        if capacity is None:
            continue
        for window in section_windows:
            window_start, window_end = minute(window["start"]), minute(window["end"])
            candidate = window_start
            while candidate + defect.required_duration_mins <= window_end:
                candidate_end = candidate + defect.required_duration_mins
                if used_minutes.get(defect.section, 0) + defect.required_duration_mins > capacity.max_daily_block_mins:
                    break
                if any(
                    candidate < end + BUFFER_MINUTES and candidate_end + BUFFER_MINUTES > start
                    for start, end in used.get(defect.section, [])
                ):
                    candidate += BUFFER_MINUTES
                    continue
                if any(
                    overlap(candidate, candidate_end, minute(item["start"]), minute(item["end"]))
                    for item in premium.get(defect.section, [])
                ):
                    candidate += BUFFER_MINUTES
                    continue
                used.setdefault(defect.section, []).append((candidate, candidate_end))
                used_minutes[defect.section] = used_minutes.get(defect.section, 0) + defect.required_duration_mins
                blocks.append(ScheduleBlock(
                    defect_id=defect.defect_id,
                    section=defect.section,
                    department=defect.department,
                    start_time_hhmm=hhmm(candidate),
                    end_time_hhmm=hhmm(candidate_end),
                    duration_mins=defect.required_duration_mins,
                    priority_rank=rank,
                ))
                break
            if any(block.defect_id == defect.defect_id for block in blocks):
                break

    risk = sum(
        defect.calculated_risk_score * defect.required_duration_mins
        for defect in request.defects
        if any(block.defect_id == defect.defect_id for block in blocks)
    )
    return SolverResponse(
        schedule_blocks=blocks,
        total_risk_reduced=round(risk, 2),
        estimated_train_delay_mins=0.0,
        solver_status="FEASIBLE_HEURISTIC",
        execution_time_ms=round((time.perf_counter() - started) * 1000, 2),
    )


def cp_sat_response(request: SolverRequest) -> SolverResponse:
    started = time.perf_counter()
    try:
        result = solve_schedule(
            [defect.model_dump() for defect in request.defects],
            {section: limits.model_dump() for section, limits in request.section_capacity_limits.items()},
            {"premium_train_windows": grouped_premium(request.premium_train_windows)},
            time_limit_seconds=10.0,
            available_time_windows=grouped_windows(request.available_time_windows),
            penalty_weights=request.penalty_weights.model_dump(),
        )
    except Exception:
        return fallback_schedule(request)
    if result["solver_status"] != "OPTIMAL":
        return fallback_schedule(request)

    rank_by_id = {
        defect.defect_id: rank
        for rank, defect in enumerate(
            sorted(request.defects, key=lambda item: item.calculated_risk_score, reverse=True), start=1
        )
    }
    blocks = [
        ScheduleBlock(
            defect_id=block["defect_id"],
            section=block["section"],
            department=block["department"],
            start_time_hhmm=block["start_time"],
            end_time_hhmm=block["end_time"],
            duration_mins=block["duration_mins"],
            priority_rank=rank_by_id[block["defect_id"]],
        )
        for block in result["scheduled_blocks"]
    ]
    return SolverResponse(
        schedule_blocks=blocks,
        total_risk_reduced=result["total_risk_mitigated"],
        estimated_train_delay_mins=result["train_detention_cost"],
        solver_status=result["solver_status"],
        execution_time_ms=round((time.perf_counter() - started) * 1000, 2),
    )


@app.post("/solver/optimize", response_model=SolverResponse)
def optimize(request: SolverRequest) -> SolverResponse:
    return cp_sat_response(request)


@app.post("/solver/simulate-conflict")
def simulate_conflict(request: ConflictSimulationRequest) -> dict[str, Any]:
    violations: list[dict[str, Any]] = []
    detention_minutes = 0
    by_section: dict[str, list[ConflictBlock]] = {}
    for block in request.maintenance_blocks:
        by_section.setdefault(block.section, []).append(block)
        block_start, block_end = minute(block.start_time_hhmm), minute(block.end_time_hhmm)
        for train in request.premium_train_windows:
            if train.section == block.section:
                delay = overlap(block_start, block_end, minute(train.start_time_hhmm), minute(train.end_time_hhmm))
                if delay:
                    detention_minutes += delay
                    violations.append({"type": "PREMIUM_TRAIN_OVERLAP", "defect_id": block.defect_id, "train_no": train.train_no, "delay_mins": delay})

    for section, blocks in by_section.items():
        capacity = request.section_capacity_limits.get(section)
        if capacity and sum(block.duration_mins for block in blocks) > capacity.max_daily_block_mins:
            violations.append({"type": "SECTION_CAPACITY_EXCEEDED", "section": section})
        ordered = sorted(blocks, key=lambda block: minute(block.start_time_hhmm))
        for left, right in zip(ordered, ordered[1:]):
            gap = minute(right.start_time_hhmm) - minute(left.end_time_hhmm)
            if gap < BUFFER_MINUTES:
                violations.append({"type": "SAFETY_BUFFER_VIOLATION", "section": section, "defect_ids": [left.defect_id, right.defect_id], "required_buffer_mins": BUFFER_MINUTES, "actual_buffer_mins": gap})

    return {"has_conflicts": bool(violations), "estimated_train_delay_mins": detention_minutes, "constraint_violations": violations}