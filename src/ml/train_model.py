"""Train and explain the RAKSHA-BLOCK defect-priority regression model."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import lightgbm as lgb
import pandas as pd
import shap
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT_DIR / "data" / "synthetic" / "defects.csv"
MODEL_DIR = ROOT_DIR / "models"
MODEL_PATH = MODEL_DIR / "defect_priority_lgb.pkl"
IMPORTANCE_PATH = MODEL_DIR / "feature_importance.json"

TARGET = "calculated_risk_score"
NUMERICAL_FEATURES = [
    "severity",
    "days_overdue",
    "asset_age_years",
    "past_failure_count",
    "deferred_count",
]
CATEGORICAL_FEATURES = ["department", "section"]
FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


def load_training_data() -> tuple[pd.DataFrame, pd.Series]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found: {DATA_PATH}")

    frame = pd.read_csv(DATA_PATH)
    required_columns = FEATURES + [TARGET]
    missing = [column for column in required_columns if column not in frame.columns]
    if missing:
        raise ValueError(f"Training data is missing required columns: {', '.join(missing)}")

    selected = frame[required_columns].copy()
    if selected.isna().any().any():
        missing_columns = selected.columns[selected.isna().any()].tolist()
        raise ValueError(f"Training data contains missing values in: {', '.join(missing_columns)}")

    for column in NUMERICAL_FEATURES + [TARGET]:
        selected[column] = pd.to_numeric(selected[column], errors="raise")
    for column in CATEGORICAL_FEATURES:
        selected[column] = selected[column].astype("category")

    features = selected[FEATURES]
    target = selected[TARGET].astype(float)
    if not target.between(5.0, 100.0).all():
        raise ValueError("Target calculated_risk_score must be between 5.0 and 100.0")
    return features, target


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", "passthrough", NUMERICAL_FEATURES),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        verbose_feature_names_out=False,
    )
    model = lgb.LGBMRegressor(
        n_estimators=150,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        verbosity=-1,
    )
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def save_shap_importance(pipeline: Pipeline, test_features: pd.DataFrame) -> None:
    preprocessor = pipeline.named_steps["preprocessor"]
    model = pipeline.named_steps["model"]
    transformed = preprocessor.transform(test_features)
    feature_names = list(preprocessor.get_feature_names_out())
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(transformed)
    if isinstance(shap_values, list):
        shap_values = shap_values[0]

    mean_abs_values = abs(shap_values).mean(axis=0)
    importance = [
        {"feature": name, "mean_abs_shap_value": round(float(value), 6)}
        for name, value in zip(feature_names, mean_abs_values)
    ]
    importance.sort(key=lambda item: item["mean_abs_shap_value"], reverse=True)
    IMPORTANCE_PATH.write_text(
        json.dumps(
            {
                "target": TARGET,
                "sample_rows": len(test_features),
                "feature_importance": importance,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    try:
        features, target = load_training_data()
        train_features, test_features, train_target, test_target = train_test_split(
            features,
            target,
            test_size=0.2,
            random_state=42,
        )
        pipeline = build_pipeline()
        pipeline.fit(train_features, train_target)

        predictions = pipeline.predict(test_features)
        rmse = mean_squared_error(test_target, predictions) ** 0.5
        mae = mean_absolute_error(test_target, predictions)
        r2 = r2_score(test_target, predictions)

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, MODEL_PATH)
        save_shap_importance(pipeline, test_features)

        print("RAKSHA-BLOCK defect-priority model training complete")
        print(f"Training rows: {len(train_features)} | Test rows: {len(test_features)}")
        print(f"RMSE: {rmse:.4f}")
        print(f"MAE:  {mae:.4f}")
        print(f"R^2:  {r2:.4f}")
        print(f"Model artifact: {MODEL_PATH.relative_to(ROOT_DIR)}")
        print(f"SHAP artifact:  {IMPORTANCE_PATH.relative_to(ROOT_DIR)}")
        return 0
    except Exception as exc:
        print(f"ERROR: Model training failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())