"""Train and apply the academic risk model to manually entered module data."""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import lightgbm as lgb


BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = Path(os.getenv("RISK_TRAINING_DATA", BASE_DIR / "data" / "student_academic_risk.csv"))
MODEL_DIR = Path(__file__).resolve().parent / "ModelOutput"
MODEL_PATH = MODEL_DIR / "risk_model.joblib"
_MODEL_CACHE = None
_MODEL_DATA_MTIME_NS = None

# Core performance features available in student_academic_risk.csv.
FEATURES = [
    "previous_gpa",
    "attendance",
    "assignment_score",
    "quiz_score",
    "study_hours",
    "engagement_score",
    "late_assignments",
    "completed_assignments",
    "learning_progress",
]
OPTIONAL_INPUT_FEATURES = {
    "previous_gpa",
}
MANUAL_INPUT_FEATURES = [
    "attendance",
    "assignment_score",
    "quiz_score",
    "study_hours",
    "engagement_score",
    "late_assignments",
    "completed_assignments",
    "learning_progress",
]
RISK_LEVELS = {"low": "Low", "medium": "Medium", "high": "High"}
RISK_FACTOR_LABELS = {
    "previous_gpa": "Previous GPA",
    "attendance": "Attendance",
    "assignment_score": "Assignment Score",
    "quiz_score": "Quiz Score",
    "study_hours": "Study Hours",
    "engagement_score": "Engagement Score",
    "late_assignments": "Late Assignments",
    "completed_assignments": "Completed Assignments",
    "learning_progress": "Learning Progress",
}


def _add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived features using only values collected by the manual form."""
    df = df.copy()
    df["score_avg"] = (df["assignment_score"] + df["quiz_score"]) / 2
    df["late_ratio"] = df["late_assignments"] / df["completed_assignments"].clip(lower=1)
    return df


# Train with the same fields the manual form collects, so omitted form fields
# do not get replaced by medians and distort the prediction.
MODEL_FEATURES = MANUAL_INPUT_FEATURES + [
    "score_avg",
    "late_ratio",
]


def _make_pipeline(class_weight: dict | None = None) -> Pipeline:
    from collections import Counter
    estimator = lgb.LGBMClassifier(
        n_estimators=600,
        learning_rate=0.03,
        max_depth=10,
        num_leaves=127,
        min_child_samples=5,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight=class_weight,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    return Pipeline(
        [
            ("impute", SimpleImputer(strategy="median")),
            ("classifier", estimator),
        ]
    )


def train_model() -> tuple[Pipeline, dict[str, object]]:
    """Train from the labeled CSV and save the estimator in ModelOutput."""
    global _MODEL_CACHE, _MODEL_DATA_MTIME_NS
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Training dataset not found at {DATASET_PATH}. Add student_academic_risk.csv to python/data/ "
            "or set RISK_TRAINING_DATA in python/.env."
        )

    training = pd.read_csv(DATASET_PATH)
    missing = [column for column in FEATURES + ["academic_risk_level"] if column not in training.columns]
    if missing:
        raise ValueError(f"Training CSV is missing required columns: {', '.join(missing)}")

    training["risk_level"] = (
        training["academic_risk_level"].astype(str).str.strip().str.lower().map(RISK_LEVELS)
    )
    training = training.dropna(subset=["risk_level"])
    if training["risk_level"].nunique() != 3:
        raise ValueError("Training CSV must contain Low, Medium, and High academic_risk_level labels.")

    # Add engineered features
    training = _add_engineered_features(training)

    # Establish data-derived indicators from the Low-risk cohort. For positive
    # performance measures, values below the 25th percentile are weak compared
    # with Low-risk students. For late assignments, values above the 75th
    # percentile are flagged. These explainers are indicators, not causal claims.
    low_risk_rows = training.loc[training["risk_level"] == "Low", MANUAL_INPUT_FEATURES]
    weak_thresholds = {
        feature: float(low_risk_rows[feature].quantile(0.25))
        for feature in MANUAL_INPUT_FEATURES
        if feature != "late_assignments"
    }
    weak_thresholds["late_assignments"] = float(low_risk_rows["late_assignments"].quantile(0.75))

    # Compute balanced class weights
    from collections import Counter
    counts = Counter(training["risk_level"])
    total = len(training["risk_level"])
    class_weight = {cls: total / (3 * cnt) for cls, cnt in counts.items()}

    X = training[MODEL_FEATURES]
    y = training["risk_level"]

    model = _make_pipeline(class_weight=class_weight)
    model.fit(X, y)

    # Compute training accuracy for informational logging
    from sklearn.metrics import accuracy_score
    train_acc = accuracy_score(y, model.predict(X))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    import joblib
    joblib.dump(model, MODEL_PATH)

    training_info = {
        "training_rows": len(training),
        "classes": int(training["risk_level"].nunique()),
        "accuracy": train_acc,
        "weak_thresholds": weak_thresholds,
    }
    _MODEL_CACHE = (model, training_info)
    _MODEL_DATA_MTIME_NS = DATASET_PATH.stat().st_mtime_ns
    return model, training_info


def _get_trained_model() -> tuple[Pipeline, dict[str, object]]:
    global _MODEL_CACHE, _MODEL_DATA_MTIME_NS
    if not DATASET_PATH.is_file():
        raise FileNotFoundError(f"Training dataset not found at {DATASET_PATH}.")
    data_mtime_ns = DATASET_PATH.stat().st_mtime_ns
    if _MODEL_CACHE is None or _MODEL_DATA_MTIME_NS != data_mtime_ns:
        return train_model()
    return _MODEL_CACHE


def assess_records(records: pd.DataFrame | list[dict], *, only_at_risk: bool = False) -> list[dict]:
    """Predict risk and weak indicators for records submitted through the app."""
    model, training_info = _get_trained_model()
    weak_thresholds = training_info["weak_thresholds"]
    if not isinstance(records, pd.DataFrame):
        records = pd.DataFrame(records)
    required = ["user_id", "student_id", "student_name", "module_id", "module_name"] + MANUAL_INPUT_FEATURES
    missing = [column for column in required if column not in records.columns]
    if missing:
        raise ValueError(f"Risk assessment records are missing required fields: {', '.join(missing)}")
    if records.empty:
        return []
    records = records.copy()
    for feature in OPTIONAL_INPUT_FEATURES:
        if feature not in records.columns:
            records[feature] = float("nan")
    records[FEATURES] = records[FEATURES].apply(pd.to_numeric, errors="coerce")

    # Add engineered features for prediction
    records = _add_engineered_features(records)

    predictions = model.predict(records[MODEL_FEATURES])
    probabilities = model.predict_proba(records[MODEL_FEATURES])
    records["risk_level"] = predictions
    records["confidence"] = probabilities.max(axis=1)
    records["risk_probabilities"] = [
        {
            str(level): round(float(probability), 4)
            for level, probability in zip(model.classes_, row_probabilities)
        }
        for row_probabilities in probabilities
    ]
    if only_at_risk:
        records = records[records["risk_level"].isin(["High", "Medium"])]
    return [
        {
            "user_id": str(row["user_id"]),
            "student_id": str(row["student_id"]),
            "student_name": str(row["student_name"]),
            "module_id": str(row["module_id"]),
            "module_name": str(row["module_name"]),
            "risk_level": str(row["risk_level"]),
            "confidence": round(float(row["confidence"]), 3),
            "risk_probabilities": row["risk_probabilities"],
            "risk_factors": _risk_factors(row, weak_thresholds),
            "previous_gpa": _number(row["previous_gpa"]),
            "attendance": _number(row["attendance"]),
            "assignment_score": _number(row["assignment_score"]),
            "quiz_score": _number(row["quiz_score"]),
            "study_hours": _number(row["study_hours"]),
            "engagement_score": _number(row["engagement_score"]),
            "late_assignments": _number(row["late_assignments"]),
            "completed_assignments": _number(row["completed_assignments"]),
            "learning_progress": _number(row["learning_progress"]),
        }
        for _, row in records.iterrows()
    ]


def _number(value):
    return None if pd.isna(value) else float(value)


def _risk_factors(row, thresholds: dict[str, float]) -> list[dict]:
    """Return only indicators outside the healthy range learned from training data."""
    factors = []
    for feature in MANUAL_INPUT_FEATURES:
        value = _number(row[feature])
        if value is None:
            continue
        threshold = thresholds[feature]
        is_weak = value > threshold if feature == "late_assignments" else value < threshold
        if is_weak:
            factors.append({
                "key": feature,
                "label": RISK_FACTOR_LABELS[feature],
                "value": value,
            })
    return factors
