# from pathlib import Path
# from collections import defaultdict

# import joblib
# import numpy as np
# import pandas as pd


# # Load classification model
# BASE_DIR = Path(__file__).resolve().parent
# MODEL_PATH = BASE_DIR / "models" / "mastery_target_model.joblib"

# bundle = joblib.load(MODEL_PATH)

# classification_model = bundle["model"]
# FEATURE_COLS = bundle["features"]
# TARGET_THRESHOLD = bundle.get("target_threshold", 70)


# EXPECTED_FEATURES = [
#     "score",
#     "weakness",
#     "previous_score",
#     "previous_weakness",
#     "score_trend",
#     "days_since_previous",
#     "assessment_count",
#     "assessment_weight"
# ]

# if FEATURE_COLS != EXPECTED_FEATURES:
#     raise ValueError(
#         f"Unexpected model features: {FEATURE_COLS}"
#     )


# def derive_model_inputs(sessions):

#     daily_groups = defaultdict(list)

#     for session in sessions:

#         if session.get("task_status") != "completed":
#             continue

#         task_type = session.get("task_type")

#         if task_type == "quiz":
#             raw_score = session.get("quiz_score")

#         elif task_type == "assignment":
#             raw_score = session.get("assignment_score")

#         else:
#             continue

#         timestamp = session.get("timestamp")

#         if raw_score is None or timestamp is None:
#             continue

#         try:
#             score = float(raw_score)
#             timestamp = pd.Timestamp(timestamp)

#             if timestamp.tzinfo is None:
#                 timestamp = timestamp.tz_localize("UTC")
#             else:
#                 timestamp = timestamp.tz_convert("UTC")

#         except (ValueError, TypeError):
#             continue

#         if not np.isfinite(score) or not 0 <= score <= 100:
#             continue

#         day = timestamp.date()

#         daily_groups[day].append({
#             "score": score,
#             "task_id": session.get("task_id")
#         })

#     daily = []

#     for day in sorted(daily_groups):

#         records = daily_groups[day]

#         daily.append({
#             "date": day,
#             "score": float(
#                 np.mean([r["score"] for r in records])
#             ),
#             "assessment_count": len({
#                 r["task_id"]
#                 for r in records
#                 if r["task_id"] is not None
#             })
#         })

#     if len(daily) < 2:
#         raise ValueError(
#             "At least two different assessment dates "
#             "are required for prediction."
#         )

#     current = daily[-1]
#     previous = daily[-2]

#     current_score = current["score"]
#     previous_score = previous["score"]

#     days_difference = (
#         current["date"] - previous["date"]
#     ).days

#     features = {
#         "score": current_score,
#         "weakness": 100 - current_score,
#         "previous_score": previous_score,
#         "previous_weakness": 100 - previous_score,
#         "score_trend": current_score - previous_score,
#         "days_since_previous": float(days_difference),
#         "assessment_count": current["assessment_count"]
#     }

#     return features


# def predict_mastery(features):

#     X = pd.DataFrame(
#         [[features[col] for col in FEATURE_COLS]],
#         columns=FEATURE_COLS
#     )

#     X = X.apply(pd.to_numeric, errors="raise")

#     if not np.isfinite(X.to_numpy(dtype=float)).all():
#         raise ValueError("Model inputs must be finite numbers.")

#     prediction = int(classification_model.predict(X)[0])

#     probabilities = classification_model.predict_proba(X)[0]

#     classes = list(classification_model.classes_)

#     if 1 not in classes:
#         probability = 0.0
#     else:
#         probability = float(
#             probabilities[classes.index(1)]
#         )

#     if prediction == 1:
#         feedback = (
#             f"The model predicts that the next assessment "
#             f"may reach {TARGET_THRESHOLD}% or higher."
#         )
#     else:
#         feedback = (
#             f"The model predicts that the next assessment "
#             f"may be below {TARGET_THRESHOLD}%. "
#             "Additional practice is recommended."
#         )

#     return {
#         "current_score": features["score"],
#         "predicted_target_reached": prediction,
#         "target_threshold": TARGET_THRESHOLD,
#         "probability_target_reached": probability,
#         "feedback": feedback,
#         "features_used": features
#     }


# from pathlib import Path
# from collections import defaultdict

# import joblib
# import numpy as np
# import pandas as pd


# # Load classification model
# BASE_DIR = Path(__file__).resolve().parent
# MODEL_PATH = BASE_DIR / "models" / "mastery_target_model (2).joblib"

# bundle = joblib.load(MODEL_PATH)

# classification_model = bundle["model"]
# FEATURE_COLS = bundle["features"]
# TARGET_THRESHOLD = bundle.get("target_threshold", 70)

# EXPECTED_FEATURES = [
#     "score",
#     "weakness",
#     "previous_score",
#     "previous_weakness",
#     "score_trend",
#     "days_since_previous",
#     "assessment_count",
#     #"assessment_weight"
# ]

# if FEATURE_COLS != EXPECTED_FEATURES:
#     raise ValueError(f"Unexpected model features: {FEATURE_COLS}")


# def derive_model_inputs(sessions):

#     daily_groups = defaultdict(list)

#     print("\n========== MODEL INPUT DEBUG ==========")
#     print("Total sessions received:", len(sessions))

#     for session in sessions:

#         status = str(session.get("task_status", "")).strip().lower()
#         task_type = str(session.get("task_type", "")).strip().lower()

#         if status != "completed":
#             print("Skipped: incomplete status", status)
#             continue

#         if task_type == "quiz":
#             raw_score = session.get("quiz_score")

#         elif task_type == "assignment":
#             raw_score = session.get("assignment_score")

#         else:
#             print("Skipped: unsupported task type", task_type)
#             continue

#         timestamp = session.get("timestamp")

#         if raw_score is None or timestamp is None:
#             print("Skipped: missing score or timestamp")
#             continue

#         try:
#             score = float(raw_score)
#             timestamp = pd.Timestamp(timestamp)

#             # Use Sri Lankan local calendar dates
#             if timestamp.tzinfo is None:
#                 timestamp = timestamp.tz_localize("UTC")

#             timestamp = timestamp.tz_convert("Asia/Colombo")

#         except (ValueError, TypeError):
#             print("Skipped: invalid score or timestamp")
#             continue

#         if not np.isfinite(score) or not 0 <= score <= 100:
#             print("Skipped: invalid score", score)
#             continue

#         day = timestamp.date()

#         daily_groups[day].append({
#             "score": score,
#             "task_id": session.get("task_id")
#         })
#         #"score": float(np.mean([r["score"] for r in records]))

#         print("Accepted:", day, task_type, score)

#     daily = []

#     for day in sorted(daily_groups):

#         records = daily_groups[day]

#         daily.append({
#             "date": day,
#             "score": float(
#                 np.mean([r["score"] for r in records])
#             ),
#             "assessment_count": len({
#                 r["task_id"]
#                 for r in records
#                 if r["task_id"] is not None
#             })
#         })

#     print("\nDaily assessment records:")

#     for record in daily:
#         print(record)

#     print("Distinct assessment dates:", len(daily))
#     print("======================================")

#     if len(daily) < 2:
#         raise ValueError(
#             f"Prediction requires at least two distinct "
#             f"assessment dates. Found: {len(daily)}. "
#             "Complete another valid assessment on a "
#             "different date."
#         )

#     current = daily[-1]
#     previous = daily[-2]

#     current_score = current["score"]
#     previous_score = previous["score"]

#     days_difference = (
#         current["date"] - previous["date"]
#     ).days

#     features = {
#         "score": current_score,
#         "weakness": 100 - current_score,
#         "previous_score": previous_score,
#         "previous_weakness": 100 - previous_score,
#         "score_trend": current_score - previous_score,
#         "days_since_previous": float(days_difference),
#         "assessment_count": current["assessment_count"]
#     }

#     missing_features = [
#         col for col in FEATURE_COLS if col not in features
#     ]

#     if missing_features:
#         raise ValueError(
#             "Cannot derive model features from MongoDB: "
#             + ", ".join(missing_features)
#             + ". Retrain the model without unavailable "
#               "features or store equivalent data."
#         )

#     return features


# def predict_mastery(features):

#     missing_features = [
#         col for col in FEATURE_COLS if col not in features
#     ]

#     if missing_features:
#         raise ValueError(
#             f"Missing prediction features: {missing_features}"
#         )

#     X = pd.DataFrame(
#         [[features[col] for col in FEATURE_COLS]],
#         columns=FEATURE_COLS
#     )

#     X = X.apply(pd.to_numeric, errors="raise")

#     if not np.isfinite(X.to_numpy(dtype=float)).all():
#         raise ValueError("Model inputs must be finite numbers.")

#     prediction = int(classification_model.predict(X)[0])

#     probabilities = classification_model.predict_proba(X)[0]

#     classes = list(classification_model.classes_)

#     probability = (
#         float(probabilities[classes.index(1)])
#         if 1 in classes else 0.0
#     )

#     if prediction == 1:
#         feedback = (
#             f"The model predicts that the next assessment "
#             f"may reach {TARGET_THRESHOLD}% or higher."
#         )
#     else:
#         feedback = (
#             f"The model predicts that the next assessment "
#             f"may be below {TARGET_THRESHOLD}%. "
#             "Additional practice is recommended."
#         )

#     return {
#         "current_score": features["score"],
#         "predicted_target_reached": prediction,
#         "target_threshold": TARGET_THRESHOLD,
#         "probability_target_reached": probability,
#         "feedback": feedback,
#         "features_used": features
#     }

from pathlib import Path

import joblib
import numpy as np
import pandas as pd



BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "mastery_target_model (2).joblib"

bundle = joblib.load(MODEL_PATH)

classification_model = bundle["model"]
FEATURE_COLS = bundle["features"]
TARGET_THRESHOLD = bundle.get("target_threshold", 70)

EXPECTED_FEATURES = [
    "score",
    "weakness",
    "previous_score",
    "previous_weakness",
    "score_trend",
    "days_since_previous",
    "assessment_count"
]

if FEATURE_COLS != EXPECTED_FEATURES:
    raise ValueError(f"Unexpected model features: {FEATURE_COLS}")


def derive_model_inputs(sessions):

    assessment_records = []

    print("\n========== MODEL INPUT DEBUG ==========")
    print("Total sessions received:", len(sessions))

    for session in sessions:

        status = str(
            session.get("task_status", "")
        ).strip().lower()

        task_type = str(
            session.get("task_type", "")
        ).strip().lower()

        if status != "completed":
            continue

        if task_type == "quiz":
            raw_score = session.get("quiz_score")

        elif task_type == "assignment":
            raw_score = session.get("assignment_score")

        else:
            continue

        timestamp = session.get("timestamp")

        if raw_score is None or timestamp is None:
            continue

        try:
            score = float(raw_score)
            timestamp = pd.Timestamp(timestamp)

            if timestamp.tzinfo is None:
                timestamp = timestamp.tz_localize("UTC")

            timestamp = timestamp.tz_convert("Asia/Colombo")

        except (ValueError, TypeError):
            continue

        if not np.isfinite(score) or not 0 <= score <= 100:
            continue

        assessment_records.append({
            "timestamp": timestamp,
            "date": timestamp.date(),
            "score": score,
            "task_id": session.get("task_id"),
            "session_id": session.get("session_id")
        })

    # Sort submissions chronologically
    assessment_records.sort(
        key=lambda x: (
            x["timestamp"],
            str(x["session_id"] or "")
        )
    )

    print("\nChronological assessment records:")

    for record in assessment_records:
        print(record)

    if len(assessment_records) < 2:
        raise ValueError(
            "At least two completed assessment submissions "
            "are required for prediction."
        )

    current = assessment_records[-1]
    previous = assessment_records[-2]

    current_score = current["score"]
    previous_score = previous["score"]

    days_difference = (
        current["date"] - previous["date"]
    ).days

    # Count distinct tasks completed on the current date
    current_day_records = [
        record for record in assessment_records
        if record["date"] == current["date"]
    ]

    assessment_count = len({
        record["task_id"]
        for record in current_day_records
        if record["task_id"] is not None
    })

    features = {
        "score": current_score,
        "weakness": 100 - current_score,
        "previous_score": previous_score,
        "previous_weakness": 100 - previous_score,
        "score_trend": current_score - previous_score,
        "days_since_previous": float(days_difference),
        "assessment_count": assessment_count
    }

    print("\nGenerated model features:")
    print(features)
    print("======================================")

    return features

def predict_mastery(features):

    missing_features = [
        col for col in FEATURE_COLS
        if col not in features
    ]

    if missing_features:
        raise ValueError(
            f"Missing prediction features: {missing_features}"
        )

    X = pd.DataFrame(
        [[features[col] for col in FEATURE_COLS]],
        columns=FEATURE_COLS
    )

    X = X.apply(pd.to_numeric, errors="raise")

    if not np.isfinite(X.to_numpy(dtype=float)).all():
        raise ValueError(
            "Model inputs must be finite numbers."
        )

    prediction = int(
        classification_model.predict(X)[0]
    )

    probabilities = classification_model.predict_proba(X)[0]

    classes = list(classification_model.classes_)

    probability = (
        float(probabilities[classes.index(1)])
        if 1 in classes else 0.0
    )

    if prediction == 1:
        feedback = (
            f"The system predicts that the next assessment "
            f"may reach {TARGET_THRESHOLD}% or higher."
        )
    else:
        feedback = (
            f"The system predicts that the next assessment "
            f"may be below {TARGET_THRESHOLD}%. "
            "Additional practice is recommended."
        )

    return {
        "current_score": features["score"],
        "predicted_target_reached": prediction,
        "target_threshold": TARGET_THRESHOLD,
        "probability_target_reached": probability,
        "feedback": feedback,
        "features_used": features
    }