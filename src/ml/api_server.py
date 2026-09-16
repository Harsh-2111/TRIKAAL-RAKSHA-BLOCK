"""FastAPI service for real-time RAKSHA-BLOCK defect risk scoring."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import shap
except ImportError:  # Explanation fallback keeps the scoring API available.
    shap = None


LOGGER = logging.getLogger("raksha_block.api")
ROOT_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT_DIR / "models" / "defect_priority_lgb.pkl"
IMPORTANCE_PATH = ROOT_DIR / "models" / "feature_importance.json"

NUMERICAL_FEATURES = [
    "severity",
    "days_overdue",
    "asset_age_years",
    "past_failure_count",
    "deferred_count",
]
CATEGORICAL_FEATURES = ["department", "section"]
FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


class DefectItem(BaseModel):
    defect_id: str
    source_system: str
    department: str
    section: str
    severity: int = Field(ge=0)
    days_overdue: int = Field(ge=0)
    asset_age_years: float = Field(ge=0)
    past_failure_count: int = Field(ge=0)
    deferred_count: int = Field(ge=0)


class BatchDefectRequest(BaseModel):
    defects: list[DefectItem] = Field(min_length=1)


class RiskDriver(BaseModel):
    feature: str
    contribution: float
    direction: str


class ScoreResponse(BaseModel):
    defect_id: str
    predicted_risk_score: float
    risk_tier: str
    top_shap_drivers: list[RiskDriver]
    model_version: str
    fallback_used: bool


app = FastAPI(title="RAKSHA-BLOCK Risk Scoring API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://rakshablocktrikaal.vercel.app", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL: Any | None = None
EXPLAINER: Any | None = None
MODEL_VERSION = "fallback-ground-truth"
MODEL_LOAD_ERROR: str | None = None
FALLBACK_IMPORTANCE: list[dict[str, Any]] = []


def load_artifacts() -> None:
    global MODEL, EXPLAINER, MODEL_VERSION, MODEL_LOAD_ERROR, FALLBACK_IMPORTANCE
    try:
        FALLBACK_IMPORTANCE = json.loads(IMPORTANCE_PATH.read_text(encoding="utf-8")).get(
            "feature_importance", []
        )
    except (OSError, json.JSONDecodeError) as exc:
        LOGGER.warning("Could not load feature importance fallback: %s", exc)

    if not MODEL_PATH.exists():
        MODEL_LOAD_ERROR = f"Model artifact not found: {MODEL_PATH}"
        LOGGER.warning(MODEL_LOAD_ERROR)
        return

    try:
        MODEL = joblib.load(MODEL_PATH)
        MODEL_VERSION = f"defect_priority_lgb:{MODEL_PATH.stat().st_mtime_ns}"
        if shap is not None:
            transformed_model = MODEL.named_steps["model"]
            EXPLAINER = shap.TreeExplainer(transformed_model)
        else:
            LOGGER.warning("SHAP is unavailable; saved feature importance will explain scores")
    except Exception as exc:
        MODEL = None
        MODEL_LOAD_ERROR = f"Could not load model artifact: {exc}"
        LOGGER.exception(MODEL_LOAD_ERROR)


load_artifacts()


def item_dict(item: DefectItem) -> dict[str, Any]:
    return item.model_dump() if hasattr(item, "model_dump") else item.dict()


def risk_tier(score: float) -> str:
    if score >= 80.0:
        return "CRITICAL"
    if score >= 60.0:
        return "HIGH"
    if score >= 35.0:
        return "MEDIUM"
    return "LOW"


def fallback_score(item: DefectItem) -> float:
    values = item_dict(item)
    score = (
        values["severity"] * 12.0
        + values["days_overdue"] * 0.6
        + values["past_failure_count"] * 5.5
        + values["deferred_count"] * 7.5
        + values["asset_age_years"] * 0.4
    )
    return round(min(100.0, max(5.0, score)), 4)


def model_frame(item: DefectItem) -> pd.DataFrame:
    frame = pd.DataFrame([{key: item_dict(item)[key] for key in FEATURES}], columns=FEATURES)
    return frame


def shap_drivers(item: DefectItem) -> list[RiskDriver]:
    if MODEL is not None and EXPLAINER is not None:
        try:
            preprocessor = MODEL.named_steps["preprocessor"]
            transformed = preprocessor.transform(model_frame(item))
            values = EXPLAINER.shap_values(transformed)
            if isinstance(values, list):
                values = values[0]
            row_values = values[0]
            names = preprocessor.get_feature_names_out()
            ranked = sorted(zip(names, row_values), key=lambda pair: abs(float(pair[1])), reverse=True)[:3]
            return [
                RiskDriver(
                    feature=str(name),
                    contribution=round(float(value), 4),
                    direction="increases risk" if value >= 0 else "decreases risk",
                )
                for name, value in ranked
            ]
        except Exception as exc:
            LOGGER.warning("Live SHAP explanation failed; using saved importance: %s", exc)

    return [
        RiskDriver(feature=str(item["feature"]), contribution=0.0, direction="model importance")
        for item in FALLBACK_IMPORTANCE[:3]
    ]


def score_item(item: DefectItem) -> ScoreResponse:
    fallback_used = MODEL is None
    if MODEL is None:
        score = fallback_score(item)
    else:
        try:
            score = round(float(MODEL.predict(model_frame(item))[0]), 4)
            score = min(100.0, max(5.0, score))
        except Exception as exc:
            LOGGER.warning("Model prediction failed; using mathematical fallback: %s", exc)
            score = fallback_score(item)
            fallback_used = True

    return ScoreResponse(
        defect_id=item.defect_id,
        predicted_risk_score=score,
        risk_tier=risk_tier(score),
        top_shap_drivers=shap_drivers(item),
        model_version=MODEL_VERSION,
        fallback_used=fallback_used,
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "raksha-block-risk-scoring",
        "model_loaded": MODEL is not None,
        "model_version": MODEL_VERSION,
        "shap_available": shap is not None,
        "model_load_error": MODEL_LOAD_ERROR,
    }


@app.post("/predict/score", response_model=ScoreResponse)
def predict_score(defect: DefectItem) -> ScoreResponse:
    return score_item(defect)


@app.post("/predict/batch", response_model=list[ScoreResponse])
def predict_batch(request: BatchDefectRequest) -> list[ScoreResponse]:
    return sorted((score_item(item) for item in request.defects), key=lambda result: result.predicted_risk_score, reverse=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
