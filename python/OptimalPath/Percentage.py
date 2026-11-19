import os
from dotenv import load_dotenv
from pymongo import MongoClient
import numpy as np
import pandas as pd

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["research_db"]
students_collection = db["path_students"]

def calculate_quiz_weakness(quiz_score):
    if quiz_score is None:
        return None

    score = float(quiz_score)

    if not 0 <= score <= 100:
        raise ValueError("Quiz score must be between 0 and 100.")

    return 100.0 - score
# def get_module_weakness(student_id, module_id):
#     records = list(
#         students_collection.find(
#             {
#                 "student_id": student_id,
#                 "module_id": str(module_id)
#             },
#             {
#                 "_id": 0,
#                 "quiz_score": 1,
#                 "assignment_score": 1,
#                 "attention_score": 1
#             }
#         )
#     )

#     print("DEBUG weakness query:", {
#     "student_id": student_id,
#     "module_id": str(module_id)
#     }, flush=True)

#     print("DEBUG records found:", len(records), flush=True)
#     print("DEBUG records:", records, flush=True)

#     print("\n========== WEAKNESS DEBUG ==========")
#     print("Student ID:", repr(student_id))
#     print("Module ID:", repr(str(module_id)))
#     print("Matching records:", len(records))

#     for record in records:
#         print("Record:", record)

#     print("====================================\n")

#     def valid_values(field, attention=False):
#         values = []

#         for record in records:
#             try:
#                 value = float(record.get(field))

#                 if not np.isfinite(value):
#                     continue

#                 if attention:
#                     # Attention may be stored as a fraction (0 to 1)
#                     if 0 <= value <= 1:
#                         value *= 100
#                     elif not 0 <= value <= 100:
#                         continue
#                 else:
#                     if not 0 <= value <= 100:
#                         continue

#                 values.append(value)

#             except (TypeError, ValueError):
#                 continue

#         return values

#     quiz_scores = valid_values("quiz_score")
#     assignment_scores = valid_values("assignment_score")
#     attention_scores = valid_values("attention_score", attention=True)

#     # Use only components for which valid data exists.
#     components = []

#     if quiz_scores:
#         components.append((0.50, 100 - float(np.mean(quiz_scores))))

#     if assignment_scores:
#         components.append((0.30, 100 - float(np.mean(assignment_scores))))

#     if attention_scores:
#         components.append((0.20, 100 - float(np.mean(attention_scores))))

#     if not components:
#         return None

#     total_weight = sum(weight for weight, _ in components)

#     weakness = sum(
#         weight * component_weakness
#         for weight, component_weakness in components
#     ) / total_weight

#     return round(float(weakness), 3)
# def calculate_recency_weighted_score(scores):

#     if not scores:
#         return None

#     scores = [float(x) for x in scores]

#     if len(scores) == 1:
#         return scores[0]

#     if len(scores) == 2:
#         weights = np.array([0.4, 0.6])
#     elif len(scores) == 3:
#         weights = np.array([0.2, 0.3, 0.5])
#     else:
#         # Exponential recency weighting
#         weights = np.array([
#             0.7 ** i
#             for i in range(len(scores) - 1, -1, -1)
#         ])

#         weights = weights / weights.sum()

#     return float(np.average(scores, weights=weights))

def get_module_weakness(student_id, module_id):
    query = {
        "student_id": student_id,
        "module_id": {"$in": [str(module_id), int(module_id)]}
    }

    records = list(students_collection.find(query))

    print(
        f"DEBUG weakness lookup: student={student_id}, "
        f"module={module_id}, records={len(records)}",
        flush=True
    )

    if not records:
        print("DEBUG: No existing records for this module.", flush=True)
        return None

    # Support original fields and common Pandas merge suffixes.
    field_aliases = {
        "quiz_score": [
            "quiz_score", "quiz_score_y", "quiz_score_x"
        ],
        "assignment_score": [
            "assignment_score",
            "assignment_score_y",
            "assignment_score_x"
        ],
        "attention_score": [
            "attention_score",
            "attention_score_y",
            "attention_score_x"
        ]
    }

    values = {
        "quiz_score": [],
        "assignment_score": [],
        "attention_score": []
    }

    for record in records:
        for component, aliases in field_aliases.items():
            value = None

            # Use one value per component per record.
            for field in aliases:
                candidate = record.get(field)

                if candidate is not None:
                    try:
                        candidate = float(candidate)
                        if np.isfinite(candidate):
                            value = candidate
                            break
                    except (TypeError, ValueError):
                        continue

            if value is None:
                continue

            if component == "attention_score":
                if 0 <= value <= 1:
                    value *= 100
                elif not 0 <= value <= 100:
                    continue
            elif not 0 <= value <= 100:
                continue

            values[component].append(value)

    components = []

    weights = {
        "quiz_score": 0.50,
        "assignment_score": 0.30,
        "attention_score": 0.20
    }

    for component, weight in weights.items():
        component_values = values[component]

        # if component_values:

        #     if component == "quiz_score":
        #         current_quiz_score = calculate_recency_weighted_score(
        #             component_values
        #         )

        #         component_weakness = 100.0 - current_quiz_score

        #     else:
        #         mean_score = float(np.mean(component_values))
        #         component_weakness = 100.0 - mean_score

        #     components.append((weight, component_weakness))

        if component_values:
            mean_score = float(np.mean(component_values))
            component_weakness = 100.0 - mean_score
            components.append((weight, component_weakness))

    print("DEBUG component values:", values, flush=True)
    print("DEBUG available components:", components, flush=True)

    if not components:
        print("DEBUG: No valid assessment scores found.", flush=True)
        return None

    # Renormalize weights when some assessment components are missing.
    total_weight = sum(weight for weight, _ in components)

    weakness = sum(
        weight * component_weakness
        for weight, component_weakness in components
    ) / total_weight

    result = round(float(weakness), 3)

    print("DEBUG calculated module weakness:", result, flush=True)

    return result


# def calculate_weakness_change(before, after):
#     if before is None or after is None:
#         return {
#             "weakness_before": before,
#             "weakness_after": after,
#             "weakness_change": None,
#             "weakness_reduction_percent": None
#         }

#     # Positive means weakness decreased.
#     change = before - after

#     reduction_percent = (
#         (change / before) * 100
#         if before > 0 else None
#     )

#     return {
#         "weakness_before": round(before, 3),
#         "weakness_after": round(after, 3),
#         "weakness_change": round(change, 3),
#         "weakness_reduction_percent": (
#             round(reduction_percent, 3)
#             if reduction_percent is not None else None
#         )
#     }
def calculate_weakness_change(before, after):
    if before is None or after is None:
        return {
            "weakness_before": before,
            "weakness_after": after,
            "weakness_change": None,
            "weakness_reduction_percent": None
        }

    before = float(before)
    after = float(after)

    change = before - after

    reduction_percent = (
        (change / before) * 100
        if before > 0 else None
    )

    return {
        "weakness_before": round(before, 3),
        "weakness_after": round(after, 3),
        "weakness_change": round(change, 3),
        "weakness_reduction_percent": (
            round(reduction_percent, 3)
            if reduction_percent is not None
            else None
        )
    }