"""
Progress since the previous Component 1 assessment.

Component 1 re-predicts after new learning events, so the same student gets
several outputs over time. Comparing the newest output with the previous one
tells us whether the student is improving, and lets the advice acknowledge it
("Your attendance went from 58% to 74%").
"""

from .contract import FIELDS

RISK_ORDER = {"Low": 0, "Medium": 1, "High": 2}
HIGHER_IS_BETTER = ["attendance", "assignment_score", "quiz_score", "study_hours", "engagement_score",
                    "completed_assignments", "learning_progress"]
LOWER_IS_BETTER = ["late_assignments", "risk_score"]
# smallest change that counts as a real improvement / decline
MIN_CHANGE = {"attendance": 3, "assignment_score": 3, "quiz_score": 3, "study_hours": 1,
              "engagement_score": 3, "completed_assignments": 1, "learning_progress": 3,
              "late_assignments": 1, "risk_score": 0.05}


def compare(previous, current, previous_at=None):
    """Return a progress summary, or None when there is no previous assessment."""
    if not previous:
        return None
    fields, improved, declined = {}, 0, 0
    for field in HIGHER_IS_BETTER + LOWER_IS_BETTER:
        a, b = previous.get(field), current.get(field)
        if a is None or b is None:
            continue
        change = round(b - a, 2)
        if abs(change) < MIN_CHANGE[field]:
            direction = "same"
        elif (change > 0) == (field in HIGHER_IS_BETTER):
            direction = "improved"
            improved += 1
        else:
            direction = "declined"
            declined += 1
        fields[field] = {"label": FIELDS[field]["label"], "from": a, "to": b, "change": change,
                         "direction": direction}

    r_from, r_to = previous.get("academic_risk_level"), current.get("academic_risk_level")
    risk_direction = "same"
    if r_from in RISK_ORDER and r_to in RISK_ORDER and r_from != r_to:
        risk_direction = "improved" if RISK_ORDER[r_to] < RISK_ORDER[r_from] else "declined"

    if risk_direction == "improved" or (improved >= 2 and improved > declined * 2):
        overall = "improving"
    elif risk_direction == "declined" or (declined >= 2 and declined > improved * 2):
        overall = "declining"
    elif improved == 0 and declined == 0:
        overall = "stable"
    else:
        overall = "mixed"

    return {
        "overall": overall,
        "previous_assessed_at": previous_at,
        "risk_level": {"from": r_from, "to": r_to, "direction": risk_direction},
        "fields": fields,
        "improved": [f for f, v in fields.items() if v["direction"] == "improved"],
        "declined": [f for f, v in fields.items() if v["direction"] == "declined"],
    }


def _fmt(field, v):
    unit = FIELDS[field].get("unit", "")
    if unit == "%":
        return f"{v:g}%"
    if unit == "h/week":
        return f"{v:g} h/week"
    return f"{v:g}"


def progress_signals(progress):
    """Turn progress into signals the rules / LLM can use."""
    if not progress:
        return []
    out = []
    r = progress["risk_level"]
    if r["direction"] != "same":
        out.append({"field": "academic_risk_level", "label": "Risk level change", "value": r["to"],
                    "status": "strength" if r["direction"] == "improved" else "concern",
                    "severity": "low" if r["direction"] == "improved" else "high",
                    "pattern": "progress",
                    "message": f"Risk level changed from {r['from']} to {r['to']} since the last assessment."})
    for field, v in progress["fields"].items():
        if v["direction"] == "same" or field == "risk_score":
            continue
        verb = "improved" if v["direction"] == "improved" else "dropped" if field in HIGHER_IS_BETTER else "increased"
        out.append({"field": field, "label": v["label"], "value": v["to"],
                    "status": "strength" if v["direction"] == "improved" else "concern",
                    "severity": "low" if v["direction"] == "improved" else "medium",
                    "pattern": "progress",
                    "message": f"{v['label']} {verb} from {_fmt(field, v['from'])} to {_fmt(field, v['to'])}."})
    return out
