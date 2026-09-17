"""Verify the complete Day 2 ML training and FastAPI scoring pipeline."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import joblib
import pandas as pd
from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "models" / "defect_priority_lgb.pkl"
IMPORTANCE_PATH = ROOT_DIR / "models" / "feature_importance.json"

MOCK_DEFECTS = [
    {
        "defect_id": "VERIFY-TMS-001",
        "source_system": "TMS",
        "department": "Engineering",
        "section": "NDLS-GZB",
        "severity": 5,
        "days_overdue": 20,
        "asset_age_years": 26.0,
        "past_failure_count": 4,
        "deferred_count": 2,
    },
    {
        "defect_id": "VERIFY-SMMS-001",
        "source_system": "SMMS",
        "department": "S & T",
        "section": "DEC-GGN",
        "severity": 3,
        "days_overdue": 45,
        "asset_age_years": 14.5,
        "past_failure_count": 2,
        "deferred_count": 1,
    },
    {
        "defect_id": "VERIFY-TDMS-001",
        "source_system": "TDMS",
        "department": "TRD",
        "section": "GZB-MTC",
        "severity": 2,
        "days_overdue": 5,
        "asset_age_years": 8.0,
        "past_failure_count": 0,
        "deferred_count": 0,
    },
]


def run_training() -> str:
    result = subprocess.run(
        [sys.executable, str(ROOT_DIR / "src" / "ml" / "train_model.py")],
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
    )
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        raise RuntimeError(f"Training failed with code {result.returncode}:\n{output}")
    return output.strip()


def verify_artifacts() -> tuple[object, dict[str, object]]:
    missing = [str(path.relative_to(ROOT_DIR)) for path in (MODEL_PATH, IMPORTANCE_PATH) if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing model artifacts: {', '.join(missing)}")
    model = joblib.load(MODEL_PATH)
    importance = json.loads(IMPORTANCE_PATH.read_text(encoding="utf-8"))
    if not importance.get("feature_importance"):
        raise ValueError("feature_importance.json contains no feature importance records")
    return model, importance


def verify_api(model: object) -> tuple[float, int]:
    if str(ROOT_DIR) not in sys.path:
        sys.path.insert(0, str(ROOT_DIR))
    from src.ml import api_server

    client = TestClient(api_server.app)
    health = client.get("/health")
    assert health.status_code == 200, health.text
    assert health.json()["status"] == "ok"

    first_defect = MOCK_DEFECTS[0]
    score_response = client.post("/predict/score", json=first_defect)
    assert score_response.status_code == 200, score_response.text
    score = score_response.json()
    assert score["defect_id"] == first_defect["defect_id"]
    assert 5.0 <= score["predicted_risk_score"] <= 100.0
    assert score["risk_tier"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    assert isinstance(score["top_shap_drivers"], list)
    assert 1 <= len(score["top_shap_drivers"]) <= 3
    for driver in score["top_shap_drivers"]:
        assert isinstance(driver["feature"], str) and driver["feature"]
        assert isinstance(driver["contribution"], (int, float))
        assert driver["direction"] in {"increases risk", "decreases risk", "model importance"}

    model_frame = pd.DataFrame([first_defect]).drop(columns=["defect_id", "source_system"])
    expected = float(model.predict(model_frame)[0])
    assert abs(score["predicted_risk_score"] - round(expected, 4)) < 0.0001

    batch_response = client.post("/predict/batch", json={"defects": MOCK_DEFECTS})
    assert batch_response.status_code == 200, batch_response.text
    batch = batch_response.json()
    assert isinstance(batch, list) and len(batch) == len(MOCK_DEFECTS)
    assert {item["defect_id"] for item in batch} == {item["defect_id"] for item in MOCK_DEFECTS}
    scores = [item["predicted_risk_score"] for item in batch]
    assert scores == sorted(scores, reverse=True)
    return score["predicted_risk_score"], len(score["top_shap_drivers"])


def print_report(training_output: str, score: float, shap_count: int) -> None:
    print("\n" + "=" * 72)
    print("RAKSHA-BLOCK DAY 2 ML PIPELINE VERIFICATION")
    print("=" * 72)
    print("Training and artifact generation: PASS")
    print("FastAPI /health endpoint: PASS")
    print("FastAPI /predict/score endpoint: PASS")
    print("FastAPI /predict/batch endpoint: PASS")
    print(f"Reference predicted score: {score:.4f}")
    print(f"SHAP drivers returned: {shap_count} (top 3 maximum)")
    print("Mock systems verified: TMS, SMMS, TDMS")
    print("Day 3 OR-Tools Solver Engine readiness: READY")
    print("=" * 72)
    print("Training output:")
    print(training_output)


def main() -> int:
    try:
        training_output = run_training()
        model, _ = verify_artifacts()
        score, shap_count = verify_api(model)
        print_report(training_output, score, shap_count)
        return 0
    except Exception as exc:
        print("\nRAKSHA-BLOCK DAY 2 ML PIPELINE VERIFICATION: FAILED", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())