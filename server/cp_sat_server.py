from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from itertools import combinations
import json
import math
import re
from typing import Any

from ortools.sat.python import cp_model

HOST = "127.0.0.1"
PORT = 8000
ADJACENCY_MINUTES = 60
MAX_CANDIDATE_SIZE = 8


def time_to_minutes(value: str) -> int:
    try:
        hours, minutes = value.split(":", 1)
        return int(hours) * 60 + int(minutes)
    except (AttributeError, ValueError):
        return 0


def minutes_to_time(value: int) -> str:
    normalized = value % 1440
    return f"{normalized // 60:02d}:{normalized % 60:02d}"


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").lower().replace("section", ""))


def normalized_window(request: dict[str, Any]) -> tuple[int, int]:
    start = time_to_minutes(request.get("requestedStartTime", "00:00"))
    end = time_to_minutes(request.get("requestedEndTime", "00:00"))
    if end <= start:
        end += 1440
    return start, end


def machinery(request: dict[str, Any]) -> set[str]:
    values = request.get("machineryDeployed") or []
    return {str(value).strip().lower() for value in values if str(value).strip()}


def compatible(left: dict[str, Any], right: dict[str, Any]) -> bool:
    if normalize(left.get("section", "")) != normalize(right.get("section", "")):
        return False
    if (left.get("requestedDate") or "") != (right.get("requestedDate") or ""):
        return False
    if normalize(left.get("lineType", "")) != normalize(right.get("lineType", "")):
        return False
    if machinery(left) & machinery(right):
        return False

    left_start, left_end = normalized_window(left)
    right_start, right_end = normalized_window(right)
    return max(left_start, right_start) < min(left_end, right_end)


def candidate_is_valid(group: tuple[dict[str, Any], ...]) -> bool:
    return all(compatible(left, right) for left, right in combinations(group, 2))


def candidate_data(group: tuple[dict[str, Any], ...]) -> dict[str, Any]:
    windows = [normalized_window(request) for request in group]
    start = min(window[0] for window in windows)
    end = max(window[1] for window in windows)
    separate_duration = sum(max(1, int(request.get("durationMinutes") or (window[1] - window[0]))) for request, window in zip(group, windows))
    bundled_duration = end - start
    return {
        "requests": list(group),
        "start": start,
        "end": end,
        "separate_duration": separate_duration,
        "bundled_duration": bundled_duration,
        "saved": max(0, separate_duration - bundled_duration),
    }


def priority_score(requests: list[dict[str, Any]]) -> tuple[int, str]:
    highest = "Routine"
    score = 40
    for request in requests:
        if request.get("urgencyLevel") == "Critical Emergency" or request.get("priority") == "SAFETY_CRITICAL":
            highest = "Critical Emergency"
            score = max(score, 95)
        elif request.get("urgencyLevel") == "Priority" or request.get("priority") == "URGENT":
            if highest != "Critical Emergency":
                highest = "Priority"
            score = max(score, 75)
    departments = {request.get("department") for request in requests}
    return min(100, score + max(0, len(departments) - 1) * 8), highest


def role_for(department: str) -> str:
    if department == "TRD":
        return "OHE 25kV Isolation & Earthing (First 15m) + Inspection"
    if department == "ST":
        return "Disconnection Memo + Point/Signal Gear Adjustment"
    if department == "ENGINEERING":
        return "Track Mechanical Packing & Alignment Stabilization"
    return "Lead Machine Operation"


def justification(requests: list[dict[str, Any]], departments: list[str]) -> str:
    department_set = set(departments)
    if {"ENGINEERING", "ST", "TRD"}.issubset(department_set):
        return "Tri-Department Integrated Mega Block: Synchronized P-Way, S&T, and 25kV OHE maintenance under one coordinated block window."
    if {"ENGINEERING", "TRD"}.issubset(department_set):
        return "Coordinated P-Way and 25kV Traction Window under a common power and traffic block."
    if {"ENGINEERING", "ST"}.issubset(department_set):
        return "Joint Permanent Way and Signalling Corridor with synchronized maintenance protection."
    if {"ST", "TRD"}.issubset(department_set):
        return "Combined S&T and Overhead Traction Maintenance under a common line block."
    return f"Synchronized Multi-Team Block: bundled {', '.join(departments)} maintenance activities."


def build_result(requests: list[dict[str, Any]]) -> dict[str, Any]:
    pending = [request for request in requests if request.get("status") == "PENDING"]
    if not pending:
        return {
            "bundledWindows": [],
            "standaloneApproved": [],
            "totalBlockHoursSavedMinutes": 0,
            "totalBlockHoursSavedFormatted": "0 hrs",
            "percentHoursSaved": 0,
            "conflictReductionRatePercent": 0,
            "totalConflictsResolved": 0,
            "totalBundlesCreated": 0,
            "totalRequestsProcessed": 0,
            "hasOverlaps": False,
        }

    groups: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for request in pending:
        key = (normalize(request.get("section", "")), request.get("requestedDate", ""), normalize(request.get("lineType", "")))
        groups.setdefault(key, []).append(request)

    candidates: list[dict[str, Any]] = []
    for group in groups.values():
        upper_size = min(MAX_CANDIDATE_SIZE, len(group))
        for size in range(2, upper_size + 1):
            for combination in combinations(group, size):
                if candidate_is_valid(combination):
                    data = candidate_data(combination)
                    if data["saved"] > 0:
                        candidates.append(data)

    model = cp_model.CpModel()
    selected = [model.NewBoolVar(f"bundle_{index}") for index in range(len(candidates))]
    request_constraints: dict[str, list[Any]] = {request["id"]: [] for request in pending}
    for variable, candidate in zip(selected, candidates):
        for request in candidate["requests"]:
            request_constraints[request["id"]].append(variable)
    for variables in request_constraints.values():
        if variables:
            model.Add(sum(variables) <= 1)

    model.Maximize(sum(variable * candidate["saved"] for variable, candidate in zip(selected, candidates)))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5
    solver.parameters.num_search_workers = 8
    solver.parameters.log_search_progress = False
    solver.solve(model)

    selected_candidates = [candidate for variable, candidate in zip(selected, candidates) if solver.Value(variable) == 1]
    selected_ids = {request["id"] for candidate in selected_candidates for request in candidate["requests"]}
    bundled_windows: list[dict[str, Any]] = []
    for index, candidate in enumerate(selected_candidates, start=1):
        bundled_requests = candidate["requests"]
        departments = list(dict.fromkeys(request.get("department") for request in bundled_requests))
        score, urgency = priority_score(bundled_requests)
        duration = candidate["bundled_duration"]
        duration_formatted = f"{duration // 60}h {duration % 60}m ({duration} mins)" if duration >= 60 else f"{duration} mins"
        bundled_windows.append({
            "bundleId": f"AI-BUNDLE-2026-{index:03d}",
            "section": bundled_requests[0].get("section", ""),
            "date": bundled_requests[0].get("requestedDate", ""),
            "lineType": bundled_requests[0].get("lineType", ""),
            "startKm": bundled_requests[0].get("startKm", ""),
            "endKm": bundled_requests[-1].get("endKm", "") or bundled_requests[0].get("endKm", ""),
            "optimizedStartTime": minutes_to_time(candidate["start"]),
            "optimizedEndTime": minutes_to_time(candidate["end"]),
            "durationMinutes": duration,
            "durationFormatted": duration_formatted,
            "requests": bundled_requests,
            "departments": departments,
            "priorityScore": score,
            "urgencyLevel": urgency,
            "totalSeparateDurationMinutes": candidate["separate_duration"],
            "savedDetentionMinutes": candidate["saved"],
            "conflictsResolvedCount": len(bundled_requests) * (len(bundled_requests) - 1) // 2,
            "aiJustification": justification(bundled_requests, departments),
            "coordinationTasks": [
                {
                    "dept": request.get("department"),
                    "requestId": request.get("id"),
                    "workDescription": request.get("workCategory") or request.get("workDescription", ""),
                    "machinery": request.get("machineryDeployed") or [],
                    "roleInWindow": role_for(request.get("department", "")),
                }
                for request in bundled_requests
            ],
        })

    standalone = [request for request in pending if request["id"] not in selected_ids]
    total_separate = sum(max(1, int(request.get("durationMinutes") or 0)) for request in pending)
    total_optimized = sum(window["durationMinutes"] for window in bundled_windows) + sum(max(1, int(request.get("durationMinutes") or 0)) for request in standalone)
    saved = max(0, total_separate - total_optimized)
    conflicts = sum(window["conflictsResolvedCount"] for window in bundled_windows)
    compatible_pairs = sum(sum(1 for pair in combinations(group, 2) if compatible(pair[0], pair[1])) for group in groups.values())
    conflict_rate = round(conflicts / compatible_pairs * 100) if compatible_pairs else 0

    return {
        "bundledWindows": bundled_windows,
        "standaloneApproved": standalone,
        "totalBlockHoursSavedMinutes": saved,
        "totalBlockHoursSavedFormatted": f"{saved / 60:.1f} Hours ({saved} mins)",
        "percentHoursSaved": round(saved / total_separate * 100) if total_separate else 0,
        "conflictReductionRatePercent": conflict_rate,
        "totalConflictsResolved": conflicts,
        "totalBundlesCreated": len(bundled_windows),
        "totalRequestsProcessed": len(pending),
        "hasOverlaps": compatible_pairs > 0,
    }


class SolverHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path not in ("/", "/health"):
            self.send_error(404)
            return
        body = json.dumps({
            "status": "ok",
            "service": "Raksha Block CP-SAT backend",
            "solver": "Google OR-Tools CP-SAT",
            "endpoint": "/api/cp-sat/solve",
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/api/cp-sat/solve":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            result = build_result(payload.get("requests", []))
            body = json.dumps(result).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            body = json.dumps({"error": str(error)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[CP-SAT] {format % args}")


if __name__ == "__main__":
    print(f"CP-SAT service listening on http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), SolverHandler).serve_forever()
