"""
Input contract between Component 1 (risk model) and Component 2 (advice engine).

Component 1 is built separately, so this file is the single place that defines
what Component 2 expects to receive. When the real model is ready, only this
file (and possibly the adapter below) should need to change.

Two input shapes are accepted:
  1. The flat record produced by the Component 1 model / dataset
     (student_id, previous_gpa, attendance, ... , academic_risk_level)
  2. The versioned JSON payload in Appendix 4 of the proposal
     (schema_version, risk_assessment{...}, key_indicators{...}, risk_trend ...)

Ranges below are working assumptions for PP1 and must be confirmed with the
Component 1 owner.
"""

CONTRACT_VERSION = "c1-to-c2/1.0"

RISK_LEVELS = ("Low", "Medium", "High")
RISK_TRENDS = ("increasing", "stable", "decreasing")

# name -> definition. "used" = sent to the advice engine.
# "used": False means Component 2 receives the field but deliberately does not
# use it (data-minimisation principle from the proposal).
FIELDS = {
    "student_id": {
        "label": "Student ID", "type": "string", "required": True, "used": True,
        "description": "Pseudonymous student identifier from Component 1.",
    },
    "academic_risk_level": {
        "label": "Academic risk level", "type": "enum", "values": list(RISK_LEVELS),
        "required": True, "used": True,
        "description": "Output of the Component 1 ML model.",
    },
    "previous_gpa": {
        "label": "Previous GPA", "type": "number", "min": 0, "max": 4, "unit": "",
        "required": False, "used": False,
        "description": "Historical input to the risk model. Not used by Component 2 "
                       "(advice focuses on current, changeable behaviour).",
    },
    "attendance": {
        "label": "Attendance", "type": "number", "min": 0, "max": 100, "unit": "%",
        "required": False, "used": True,
        "description": "Percentage of sessions attended this semester.",
    },
    "assignment_score": {
        "label": "Assignment score", "type": "number", "min": 0, "max": 100, "unit": "%",
        "required": False, "used": True,
        "description": "Average assignment mark.",
    },
    "quiz_score": {
        "label": "Quiz score", "type": "number", "min": 0, "max": 100, "unit": "%",
        "required": False, "used": True,
        "description": "Average quiz mark.",
    },
    "study_hours": {
        "label": "Study hours", "type": "number", "min": 0, "max": 80, "unit": "h/week",
        "required": False, "used": True,
        "description": "Self-study hours per week recorded on the platform.",
    },
    "engagement_score": {
        "label": "Engagement score", "type": "number", "min": 0, "max": 100, "unit": "/100",
        "required": False, "used": True,
        "description": "Platform engagement (logins, forum activity, resource use).",
    },
    "late_assignments": {
        "label": "Late assignments", "type": "integer", "min": 0, "max": 50, "unit": "",
        "required": False, "used": True,
        "description": "Number of assignments submitted after the deadline.",
    },
    "completed_assignments": {
        "label": "Completed assignments", "type": "integer", "min": 0, "max": 50, "unit": "",
        "required": False, "used": True,
        "description": "Number of assignments submitted so far.",
    },
    "learning_progress": {
        "label": "Learning progress", "type": "number", "min": 0, "max": 100, "unit": "%",
        "required": False, "used": True,
        "description": "Share of course content completed.",
    },
    # Optional extras from the Appendix 4 payload. Used when present.
    "risk_score": {
        "label": "Risk score", "type": "number", "min": 0, "max": 1, "unit": "",
        "required": False, "used": True,
        "description": "Model probability / score behind the risk level (0-1).",
    },
    "risk_trend": {
        "label": "Risk trend", "type": "enum", "values": list(RISK_TRENDS),
        "required": False, "used": True,
        "description": "Direction of risk compared with the previous assessment.",
    },
    "confidence": {
        "label": "Model confidence", "type": "number", "min": 0, "max": 1, "unit": "",
        "required": False, "used": True,
        "description": "Confidence of the Component 1 prediction (0-1).",
    },
}

C1_CORE_FIELDS = [
    "student_id", "previous_gpa", "attendance", "assignment_score", "quiz_score",
    "study_hours", "engagement_score", "late_assignments", "completed_assignments",
    "learning_progress", "academic_risk_level",
]
USED_FIELDS = [k for k, v in FIELDS.items() if v["used"]]
INDICATOR_FIELDS = [k for k in USED_FIELDS if k not in ("student_id", "academic_risk_level")]


def _to_number(value, integer=False):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip().rstrip("%").strip()
        if value == "" or value.lower() in ("na", "n/a", "null", "none", "-"):
            return None
    num = float(value)
    if integer:
        if not num.is_integer():
            raise ValueError("must be a whole number")
        return int(num)
    return round(num, 2)


def _normalise_risk_level(value):
    if value is None:
        return None
    text = str(value).strip().lower()
    mapping = {
        "low": "Low", "l": "Low", "0": "Low", "low risk": "Low",
        "medium": "Medium", "moderate": "Medium", "m": "Medium", "1": "Medium", "medium risk": "Medium",
        "high": "High", "h": "High", "2": "High", "high risk": "High", "at risk": "High",
    }
    return mapping.get(text)


def _from_appendix4(payload):
    """Adapter: Appendix 4 nested payload -> flat record (0-1 indicators -> %)."""
    ra = payload.get("risk_assessment") or {}
    ki = payload.get("key_indicators") or {}

    def pct(v):
        return None if v is None else round(float(v) * 100, 1)

    flat = {
        "student_id": payload.get("student_id"),
        "academic_risk_level": ra.get("risk_level"),
        "risk_score": ra.get("risk_score"),
        "confidence": ra.get("confidence"),
        "risk_trend": payload.get("risk_trend"),
        "attendance": pct(ki.get("attendance")),
        "engagement_score": pct(ki.get("engagement")),
        # assessment_performance covers both assignments and quizzes
        "assignment_score": pct(ki.get("assessment_performance")),
        "quiz_score": pct(ki.get("assessment_performance")),
    }
    # keep any flat fields that were also supplied
    for key in FIELDS:
        if key in payload and flat.get(key) is None:
            flat[key] = payload[key]
    return flat


def normalise_record(raw):
    """
    Validate and clean one Component 1 record.

    Returns (record, errors, warnings). `record` is None when errors exist.
    """
    errors, warnings = [], []
    if not isinstance(raw, dict):
        return None, ["Record must be a JSON object."], []

    source_shape = "flat"
    if "risk_assessment" in raw or "key_indicators" in raw:
        source_shape = "appendix4"
        raw = _from_appendix4(raw)

    record = {}
    for key, spec in FIELDS.items():
        value = raw.get(key)
        try:
            if spec["type"] == "string":
                value = None if value is None else str(value).strip() or None
            elif key == "academic_risk_level":
                original = value
                value = _normalise_risk_level(value)
                if original not in (None, "") and value is None:
                    errors.append(f"{key}: '{original}' is not one of Low / Medium / High.")
                    continue
            elif key == "risk_trend":
                value = None if value in (None, "") else str(value).strip().lower()
                if value is not None and value not in RISK_TRENDS:
                    warnings.append(f"risk_trend '{value}' not recognised - ignored.")
                    value = None
            else:
                value = _to_number(value, integer=spec["type"] == "integer")
                if value is not None and not (spec["min"] <= value <= spec["max"]):
                    errors.append(f"{key}: {value} is outside the expected range "
                                  f"{spec['min']}-{spec['max']}.")
                    continue
        except (TypeError, ValueError) as exc:
            errors.append(f"{key}: invalid value '{raw.get(key)}' ({exc}).")
            continue

        if value is None and spec["required"]:
            errors.append(f"{key} is required.")
        record[key] = value

    unknown = [k for k in raw.keys() if k not in FIELDS and k not in ("course_code", "scenario")]
    if unknown:
        warnings.append("Ignored unknown fields: " + ", ".join(sorted(unknown)))

    missing = [k for k in INDICATOR_FIELDS
               if record.get(k) is None and k in C1_CORE_FIELDS]
    if missing and not errors:
        warnings.append("Missing indicators (advice will not use them): " + ", ".join(missing))

    if errors:
        return None, errors, warnings

    record["_source_shape"] = source_shape
    return record, errors, warnings


def advice_input(record):
    """Only the fields Component 2 actually uses (minimum-information principle)."""
    return {k: record.get(k) for k in USED_FIELDS if record.get(k) is not None}


def public_contract():
    return {
        "contract_version": CONTRACT_VERSION,
        "fields": FIELDS,
        "c1_core_fields": C1_CORE_FIELDS,
        "used_fields": USED_FIELDS,
        "not_used_fields": [k for k, v in FIELDS.items() if not v["used"]],
    }
