from http.server import BaseHTTPRequestHandler
import json

from server.cp_sat_server import build_result


def normalize_request(request: dict) -> dict:
    if "requestedStartTime" in request:
        return request
    start_time = request.get("start_time", "00:00")
    duration = int(request.get("duration_mins") or 1)
    try:
        hours, minutes = [int(value) for value in start_time.split(":", 1)]
        end_minutes = hours * 60 + minutes + duration
        end_time = f"{(end_minutes // 60) % 24:02d}:{end_minutes % 60:02d}"
    except (AttributeError, ValueError):
        end_time = start_time
    return {
        "id": request.get("id", ""),
        "department": str(request.get("department", "")).upper(),
        "section": str(request.get("section", "")).strip().upper(),
        "requestedDate": request.get("date", ""),
        "requestedStartTime": start_time,
        "requestedEndTime": end_time,
        "durationMinutes": duration,
        "lineType": "",
        "machineryDeployed": [],
        "status": "PENDING",
    }


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            requests = [normalize_request(item) for item in payload.get("requests", [])]
            self._send_json(200, build_result(requests))
        except Exception as error:
            self._send_json(500, {"error": str(error)})
