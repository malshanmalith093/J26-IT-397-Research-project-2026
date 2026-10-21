"""
Rule-based signal detection (transparent, testable).

The rules turn Component 1 indicators into short "signals" (concerns and
strengths). These signals:
  * are given to the LLM so its advice is grounded in real evidence, and
  * drive the offline fallback advice when OpenAI is not configured/available.

Thresholds are provisional PP1 values and should be agreed with the team /
supervisor (same as the proposal's "validated thresholds").
"""

from .contract import FIELDS

# field: (high-severity limit, medium-severity limit, strength limit)
# For "lower is worse" fields a value below the limit triggers the concern.
LOWER_IS_WORSE = {
    "attendance": (70, 80, 90),
    "assignment_score": (50, 65, 75),
    "quiz_score": (50, 65, 75),
    "study_hours": (6, 10, 15),
    "engagement_score": (40, 60, 75),
}


def _fmt(field, value):
    unit = FIELDS[field].get("unit", "")
    if unit == "%":
        return f"{value:g}%"
    if unit == "h/week":
        return f"{value:g} hours/week"
    if unit == "/100":
        return f"{value:g}/100"
    return f"{value:g}" if isinstance(value, (int, float)) else str(value)


def detect_signals(record, course):
    """Return a list of signals for the record in the context of the course."""
    signals = []

    for field, (high, medium, strong) in LOWER_IS_WORSE.items():
        value = record.get(field)
        if value is None:
            continue
        label = FIELDS[field]["label"]
        if value < high:
            signals.append(_sig(field, value, "concern", "high",
                                f"{label} is {_fmt(field, value)}, well below the target of {_fmt(field, medium)}."))
        elif value < medium:
            signals.append(_sig(field, value, "concern", "medium",
                                f"{label} is {_fmt(field, value)}, below the target of {_fmt(field, medium)}."))
        elif value >= strong:
            signals.append(_sig(field, value, "strength", "low",
                                f"{label} is strong at {_fmt(field, value)}."))

    late = record.get("late_assignments")
    if late is not None:
        if late >= 3:
            signals.append(_sig("late_assignments", late, "concern", "high",
                                f"{late} assignments were submitted late."))
        elif late >= 1:
            signals.append(_sig("late_assignments", late, "concern", "medium",
                                f"{late} assignment(s) submitted late."))
        else:
            signals.append(_sig("late_assignments", late, "strength", "low",
                                "No late submissions."))

    done = record.get("completed_assignments")
    released = course.get("assignments_released") if course else None
    if done is not None and released:
        ratio = done / released
        if ratio < 0.6:
            signals.append(_sig("completed_assignments", done, "concern", "high",
                                f"Only {done} of {released} assignments completed ({ratio:.0%})."))
        elif ratio < 0.85:
            signals.append(_sig("completed_assignments", done, "concern", "medium",
                                f"{done} of {released} assignments completed ({ratio:.0%})."))
        elif ratio >= 1:
            signals.append(_sig("completed_assignments", done, "strength", "low",
                                f"All {released} released assignments completed."))

    progress = record.get("learning_progress")
    expected = course.get("expected_progress") if course else None
    if progress is not None and expected is not None:
        gap = expected - progress
        if gap > 20:
            signals.append(_sig("learning_progress", progress, "concern", "high",
                                f"Learning progress is {progress:g}%, {gap:g} points behind the expected {expected}% for week {course['current_week']}."))
        elif gap > 8:
            signals.append(_sig("learning_progress", progress, "concern", "medium",
                                f"Learning progress is {progress:g}%, {gap:g} points behind the expected {expected}%."))
        elif gap <= -10:
            signals.append(_sig("learning_progress", progress, "strength", "low",
                                f"Learning progress ({progress:g}%) is ahead of the expected {expected}%."))

    trend = record.get("risk_trend")
    if trend == "increasing":
        signals.append(_sig("risk_trend", trend, "concern", "medium",
                            "Risk has increased since the last assessment."))
    elif trend == "decreasing":
        signals.append(_sig("risk_trend", trend, "strength", "low",
                            "Risk has decreased since the last assessment."))

    # Pattern: effort is fine but marks are low -> likely conceptual difficulty
    if (record.get("study_hours") or 0) >= 10 and (record.get("engagement_score") or 0) >= 60 \
            and min(record.get("quiz_score") or 100, record.get("assignment_score") or 100) < 60:
        signals.append({
            "field": "quiz_score", "label": "Pattern", "value": None, "status": "concern",
            "severity": "high", "pattern": "effort_without_results",
            "message": "Good study time and engagement but low marks - suggests difficulty "
                       "with concepts or study technique rather than lack of effort.",
        })

    order = {"high": 0, "medium": 1, "low": 2}
    signals.sort(key=lambda s: (s["status"] != "concern", order[s["severity"]]))
    return signals


def _sig(field, value, status, severity, message):
    return {"field": field, "label": FIELDS[field]["label"], "value": value,
            "status": status, "severity": severity, "message": message}


def overall_status(risk_level, signals):
    highs = sum(1 for s in signals if s["status"] == "concern" and s["severity"] == "high")
    if risk_level == "High" or highs >= 3:
        return "at_risk"
    if risk_level == "Medium" or highs >= 1:
        return "needs_attention"
    return "on_track"


def focus_topics(course, limit=3):
    """Recent + current topics (topic-level marks are not available from Component 1)."""
    if not course:
        return []
    week = course["current_week"]
    window = [t for t in course["topics"] if week - 2 <= t["week"] <= week + 1]
    return window[:limit]


# --------------------------------------------------------------------------
# Offline fallback advice (used when no OpenAI key or the API call fails)
# --------------------------------------------------------------------------

_TEMPLATES = {
    "attendance": ("Attend every lecture and lab for the next 3 weeks", "attendance",
                   "Set a reminder 30 minutes before each session and sit near the front. If you miss one, "
                   "watch the recording and read the slides the same day.",
                   "Regular attendance keeps you in touch with explanations and lab work that are hard to catch up on alone."),
    "assignment_score": ("Plan each assignment against the marking rubric", "assignments",
                         "Before you start, list every rubric criterion. Do a first draft 3 days before the deadline "
                         "and ask a lecturer or peer to check it against the rubric.",
                         "Rubric-driven work usually lifts marks because nothing that is graded is missed."),
    "quiz_score": ("Practise with short self-tests twice a week", "quizzes",
                   "After each topic, answer 10 practice questions without notes, then review every wrong answer "
                   "and write why it was wrong.",
                   "Active recall is one of the most effective ways to improve quiz performance."),
    "study_hours": ("Build a fixed weekly study timetable", "study_habits",
                    "Block 2 focused sessions of 45 minutes on 5 days a week (about 8 hours) in your calendar, "
                    "and log them on the platform.",
                    "Consistent study time is strongly linked with steady progress."),
    "engagement_score": ("Use the course platform actively", "engagement",
                         "Log in daily, open the week's materials, and post or answer at least one question on the forum each week.",
                         "Higher engagement means faster help and fewer gaps in understanding."),
    "late_assignments": ("Start assignments the day they are released", "time_management",
                         "Break each assignment into 3 milestones with your own deadlines 5, 3 and 1 day before the real deadline.",
                         "Earlier starts reduce late penalties and give time for feedback."),
    "completed_assignments": ("Catch up on missing assignments", "assignments",
                              "List the missing assignments, ask the lecturer which can still be submitted, and finish one per week, "
                              "starting with the one carrying the most marks.",
                              "Every completed assignment adds marks and practice for the final exam."),
    "learning_progress": ("Close the gap with the course schedule", "course_content",
                          "Go through the materials for the weeks you are behind on - one extra week of content every 3-4 days - "
                          "until you reach the current week.",
                          "Being on schedule makes lectures easier to follow and reduces exam-time pressure."),
    "risk_trend": ("Review your progress weekly", "study_habits",
                   "Every Sunday, check your marks, attendance and progress on the dashboard and pick one thing to improve next week.",
                   "A weekly review helps you reverse a rising risk trend early."),
}


def _progress_message(progress):
    if not progress:
        return ""
    parts = []
    r = progress["risk_level"]
    if r["direction"] != "same":
        parts.append(f"your risk level moved from {r['from']} to {r['to']}")
    order = progress["declined"] + progress["improved"] if progress["overall"] == "declining" \
        else progress["improved"] + progress["declined"]
    for f in [x for x in order if x != "risk_score"][:4]:
        v = progress["fields"][f]
        word = "improved" if v["direction"] == "improved" else "got worse"
        parts.append(f"{v['label'].lower()} {word} ({v['from']:g} -> {v['to']:g})")
    lead = {"improving": "You are improving since your last assessment",
            "declining": "Your progress has slipped since your last assessment",
            "mixed": "Since your last assessment some areas improved and some got worse",
            "stable": "Your results are about the same as your last assessment"}[progress["overall"]]
    return lead + (": " + "; ".join(parts) + "." if parts else ".")


def fallback_advice(record, course, signals, progress=None):
    risk = record["academic_risk_level"]
    status = overall_status(risk, signals)
    concerns = [s for s in signals if s["status"] == "concern"]
    strengths = [s for s in signals if s["status"] == "strength"]

    recs, used_fields = [], set()
    for s in concerns:
        if s.get("pattern") == "effort_without_results":
            recs.append({
                "title": "Change how you study, not how much",
                "category": "course_content",
                "priority": "high",
                "action": "Replace re-reading with worked examples and practice problems. Bring 2-3 specific "
                          "questions to the lecturer's consultation hour each week.",
                "main_reason": s["message"],
                "evidence_fields": ["study_hours", "engagement_score", "quiz_score"],
                "expected_impact": "Better understanding of difficult concepts and higher quiz marks.",
                "timeframe": "Next 2 weeks",
            })
            continue
        if s["field"] in used_fields or s["field"] not in _TEMPLATES:
            continue
        title, category, action, impact = _TEMPLATES[s["field"]]
        recs.append({
            "title": title, "category": category,
            "priority": "high" if s["severity"] == "high" else "medium",
            "action": action, "main_reason": s["message"],
            "evidence_fields": [s["field"]], "expected_impact": impact,
            "timeframe": "This week" if s["severity"] == "high" else "Next 2 weeks",
        })
        used_fields.add(s["field"])

    if risk == "High":
        # placed second so it is never cut off by the 6-item limit
        recs.insert(min(1, len(recs)), {
            "title": "Meet your lecturer or academic advisor",
            "category": "support",
            "priority": "high",
            "action": "Book a short meeting this week to agree on a catch-up plan for this course.",
            "main_reason": "Component 1 classified your current academic risk as High.",
            "evidence_fields": ["academic_risk_level"],
            "expected_impact": "Early support and a clear plan from someone who knows the course.",
            "timeframe": "This week",
        })

    if not recs:
        recs.append({
            "title": "Take on a stretch goal",
            "category": "course_content",
            "priority": "low",
            "action": "Try an advanced exercise or help peers on the forum for the upcoming topic.",
            "main_reason": "Your indicators are at or above target and your risk level is Low.",
            "evidence_fields": ["academic_risk_level"],
            "expected_impact": "Deeper understanding and stronger final grades.",
            "timeframe": "Next 2 weeks",
        })

    recs = recs[:6]
    topics = focus_topics(course)
    course_name = f"{course['code']} {course['name']}" if course else "this course"

    headline = {
        "at_risk": f"You need support now to get back on track in {course_name}.",
        "needs_attention": f"You are doing okay in {course_name}, but a few areas need attention.",
        "on_track": f"You are on track in {course_name} - keep it up.",
    }[status]
    if progress and progress["overall"] == "improving":
        headline = f"You are improving in {course_name} - keep going." if status != "at_risk" else \
            f"You are improving in {course_name}, but you still need support to get fully back on track."
    elif progress and progress["overall"] == "declining":
        headline = f"Your progress in {course_name} has slipped since the last assessment - let's fix it now."

    return {
        "status_summary": {
            "overall_status": status,
            "headline": headline,
            "explanation": " ".join(s["message"] for s in concerns[:3]) or
                           "Your indicators are at or above the targets.",
        },
        "strengths": [{"area": s["label"], "evidence": s["message"]} for s in strengths[:4]],
        "concerns": [{"area": s["label"], "evidence": s["message"], "severity": s["severity"]}
                     for s in concerns[:5]],
        "recommendations": recs,
        "improvement_guide": {
            "weekly_plan": [
                {"week": 1, "focus": "Stabilise",
                 "tasks": [r["title"] for r in recs[:2]]},
                {"week": 2, "focus": "Catch up and practise",
                 "tasks": [f"Revise: {t['title']}" for t in topics[:2]] or ["Revise recent topics"]},
                {"week": 3, "focus": "Review and prepare",
                 "tasks": (course.get("upcoming", [])[:1] if course else []) + ["Weekly progress review"]},
            ],
            "course_focus_topics": [
                {"topic": t["title"], "week": t["week"],
                 "why": f"Week {t['week']} topic - recent or current material in {course_name}.",
                 "how": "Summarise the lecture in your own words and complete the practice questions."}
                for t in topics
            ],
        },
        "other_advice": [
            "Sleep 7-8 hours, especially before quizzes - memory consolidation depends on it.",
            "Use the university's study-skills and counselling services if you feel overwhelmed.",
        ],
        "motivation_message": "Small, steady changes each week make a big difference by the end of the semester.",
        "progress_message": _progress_message(progress),
    }
