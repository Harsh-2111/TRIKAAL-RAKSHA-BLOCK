from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from server.cp_sat_server import build_result, minutes_to_time


class OptimizationRequest(BaseModel):
    id: str
    department: str
    section: str
    date: str
    start_time: str
    duration_mins: int = Field(ge=1)


class OptimizationPayload(BaseModel):
    requests: list[OptimizationRequest] = Field(default_factory=list)
    premium_train_windows: list[dict[str, Any]] = Field(default_factory=list)


app = FastAPI(title="RAKSHA-BLOCK CP-SAT Solver", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def normalize_section(value: str) -> str:
    return "".join(value.upper().replace("SECTION", "").split())


def end_time(start_time: str, duration_mins: int) -> str:
    try:
        start = datetime.strptime(start_time, "%H:%M")
        return (start + timedelta(minutes=duration_mins)).strftime("%H:%M")
    except ValueError:
        return minutes_to_time(duration_mins)


def to_solver_request(request: OptimizationRequest) -> dict[str, Any]:
    return {
        "id": request.id,
        "department": request.department.upper().strip(),
        "section": normalize_section(request.section),
        "requestedDate": request.date,
        "requestedStartTime": request.start_time,
        "requestedEndTime": end_time(request.start_time, request.duration_mins),
        "durationMinutes": request.duration_mins,
        "lineType": "",
        "machineryDeployed": [],
        "status": "PENDING",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "RAKSHA-BLOCK CP-SAT backend"}


@app.post("/api/optimize")
def optimize(payload: OptimizationPayload) -> dict[str, Any]:
    requests = [to_solver_request(request) for request in payload.requests]
    return build_result(requests, payload.premium_train_windows)
