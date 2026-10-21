"""
Advice generation with an LLM (OpenAI, Azure AI Foundry, Azure OpenAI or any
OpenAI-compatible custom endpoint - see llm_client.py for configuration).

Flow:  Component 1 record -> contract.normalise_record -> signals.detect_signals
       -> LLM (JSON output) -> coerce + validate -> advice
If no provider is configured or the call fails, signals.fallback_advice is used
and the response is clearly marked as "rule_based_fallback".
ADVICE_MODE=fallback forces the offline rule-based mode (demo without internet).
"""

import hashlib
import json
import os
import re
import threading
import time
from datetime import datetime, timezone

from . import llm_client
from .contract import CONTRACT_VERSION, FIELDS, advice_input
from .progress import progress_signals
from .signals import detect_signals, fallback_advice, focus_topics, overall_status

PROMPT_VERSION = "advice-prompt/1.3"

CATEGORIES = ["study_habits", "attendance", "assignments", "quizzes", "engagement",
              "time_management", "course_content", "support", "wellbeing"]

ADVICE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["status_summary", "strengths", "concerns", "recommendations",
                 "improvement_guide", "other_advice", "motivation_message", "progress_message"],
    "properties": {
        "status_summary": {
            "type": "object", "additionalProperties": False,
            "required": ["overall_status", "headline", "explanation"],
            "properties": {
                "overall_status": {"type": "string", "enum": ["on_track", "needs_attention", "at_risk"]},
                "headline": {"type": "string"},
                "explanation": {"type": "string"},
            },
        },
        "strengths": {
            "type": "array",
            "items": {"type": "object", "additionalProperties": False,
                      "required": ["area", "evidence"],
                      "properties": {"area": {"type": "string"}, "evidence": {"type": "string"}}},
        },
        "concerns": {
            "type": "array",
            "items": {"type": "object", "additionalProperties": False,
                      "required": ["area", "evidence", "severity"],
                      "properties": {"area": {"type": "string"}, "evidence": {"type": "string"},
                                     "severity": {"type": "string", "enum": ["high", "medium", "low"]}}},
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["title", "category", "priority", "action", "main_reason",
                             "evidence_fields", "expected_impact", "timeframe"],
                "properties": {
                    "title": {"type": "string"},
                    "category": {"type": "string", "enum": CATEGORIES},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                    "action": {"type": "string"},
                    "main_reason": {"type": "string"},
                    "evidence_fields": {"type": "array", "items": {"type": "string"}},
                    "expected_impact": {"type": "string"},
                    "timeframe": {"type": "string"},
                },
            },
        },
        "improvement_guide": {
            "type": "object", "additionalProperties": False,
            "required": ["weekly_plan", "course_focus_topics"],
            "properties": {
                "weekly_plan": {
                    "type": "array",
                    "items": {"type": "object", "additionalProperties": False,
                              "required": ["week", "focus", "tasks"],
                              "properties": {"week": {"type": "integer"}, "focus": {"type": "string"},
                                             "tasks": {"type": "array", "items": {"type": "string"}}}},
                },
                "course_focus_topics": {
                    "type": "array",
                    "items": {"type": "object", "additionalProperties": False,
                              "required": ["topic", "week", "why", "how"],
                              "properties": {"topic": {"type": "string"}, "week": {"type": "integer"},
                                             "why": {"type": "string"}, "how": {"type": "string"}}},
                },
            },
        },
        "other_advice": {"type": "array", "items": {"type": "string"}},
        "motivation_message": {"type": "string"},
        "progress_message": {"type": "string"},
    },
}

SYSTEM_PROMPT = """You are the academic advice engine of EduPulse, an AI-powered personalised
e-learning system for undergraduate IT students at SLIIT (Sri Lanka).

You receive (1) a student's current indicators and academic risk level produced by a separate
machine-learning risk model (Component 1), (2) rule-based signals already detected from those
indicators, and (3) context about the course the student is taking now.

Write personalised, practical advice for the STUDENT (address them as "you").

Rules:
- Base everything ONLY on the data given. Never invent marks, topics, deadlines or facts.
- Give 3 to 6 recommendations, ordered from highest to lowest priority.
- Every recommendation MUST have a "main_reason" that explains WHY it is recommended by quoting
  the specific evidence (field values, gaps to targets, risk level or trend), e.g.
  "Your quiz average is 38%, below the 65% target, while study time is only 4 hours/week."
- "evidence_fields" must list only field names from the input indicators that support the reason.
- "action" must be concrete and doable (what, how often, how long), not generic.
- Topic-level marks are NOT available. When choosing course_focus_topics, pick ONLY from the
  course topic list (copy the exact title into "topic" and its week number into "week"), prefer
  recent/current weeks, and use the lesson summary to make "how" specific to that lesson.
- If "progress_since_last_assessment" is given, the student was assessed before. Say clearly in
  "progress_message" whether they are improving, declining or mixed, quoting the biggest changes
  with numbers (e.g. "Attendance rose from 58% to 74%"). Praise real improvements, do not repeat
  advice for areas that are now on target, and focus recommendations on what still needs work or
  got worse. If there is no previous assessment, set "progress_message" to an empty string.
- If the risk level is High, include one recommendation to contact the lecturer or academic advisor.
- Be supportive and non-judgemental. Do not label the student as a failure. No medical or
  clinical diagnosis; for stress, suggest university support services.
- The risk level is a prediction, not a final judgement - you may say it can change.
- The weekly_plan covers the next 3 weeks (week 1 = this coming week).
- Use simple, clear English. Keep each text field short (1-3 sentences).
- The student must NEVER see internal variable names or technical notation. In every
  student-facing text (headline, explanation, evidence, reasons, actions, messages):
  * never write field names like "completed_assignments" or "risk_trend" - use the plain
    labels from "field_definitions" instead ("completed assignments", "risk trend");
  * never use "name = value" or arrow notation like "58.0->58.0" - write it naturally,
    e.g. "you completed 2 of the 6 assignments" or "attendance stayed at 58%";
  * never mention "signals", "fields", "the input" or other system terms.
  Technical field names are allowed ONLY inside "evidence_fields"."""


def provider_info():
    """Safe-to-share provider status (no keys)."""
    return llm_client.public_info()


# --------------------------------------------------------------------------
# Prompt building and validation
# --------------------------------------------------------------------------

def build_user_message(record, course, signals, progress=None):
    payload = {
        "student_indicators": advice_input(record),
        "field_definitions": {k: {"label": FIELDS[k]["label"], "unit": FIELDS[k].get("unit", "")}
                              for k in advice_input(record)},
        "detected_signals": [{k: v for k, v in s.items() if k in ("field", "status", "severity", "message")}
                             for s in signals],
        "suggested_overall_status": overall_status(record["academic_risk_level"], signals),
        "course_context": None if not course else {
            "code": course["code"], "name": course["name"],
            "current_week": course["current_week"], "total_weeks": course["total_weeks"],
            "assignments_released": course["assignments_released"],
            "expected_progress_percent": course["expected_progress"],
            "upcoming_assessments": course.get("upcoming", []),
            "topics": course["topics"],
            "suggested_focus_topics": [t["title"] for t in focus_topics(course)],
        },
        "progress_since_last_assessment": None if not progress else {
            "overall": progress["overall"],
            "risk_level": progress["risk_level"],
            "changes": {f: {k: v[k] for k in ("from", "to", "direction")} for f, v in progress["fields"].items()},
        },
    }
    return ("Generate the advice for this student as JSON that follows the schema.\n\n"
            + json.dumps(payload, indent=2))


def _pick(value, allowed, default):
    value = str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
    return value if value in allowed else default


def coerce_advice(advice, record):
    """
    Make sure the reply has the expected shape. Strict JSON-schema mode guarantees
    it, but json_object / prompt mode (custom endpoints, some Foundry models) do not.
    """
    if not isinstance(advice, dict):
        raise ValueError("Model reply is not a JSON object")
    as_list = lambda v: v if isinstance(v, list) else ([] if v in (None, "") else [v])
    text = lambda v: "" if v is None else str(v).strip()

    s = advice.get("status_summary") or {}
    status = {
        "overall_status": _pick(s.get("overall_status"), ("on_track", "needs_attention", "at_risk"),
                                overall_status(record["academic_risk_level"], [])),
        "headline": text(s.get("headline")),
        "explanation": text(s.get("explanation")),
    }
    recs = []
    for r in as_list(advice.get("recommendations")):
        if not isinstance(r, dict):
            continue
        recs.append({
            "title": text(r.get("title")),
            "category": _pick(r.get("category"), CATEGORIES, "study_habits"),
            "priority": _pick(r.get("priority"), ("high", "medium", "low"), "medium"),
            "action": text(r.get("action")),
            "main_reason": text(r.get("main_reason") or r.get("reason")),
            "evidence_fields": [text(f) for f in as_list(r.get("evidence_fields"))],
            "expected_impact": text(r.get("expected_impact")),
            "timeframe": text(r.get("timeframe")),
        })
    guide = advice.get("improvement_guide") or {}
    weeks = []
    for i, w in enumerate(as_list(guide.get("weekly_plan")), start=1):
        if isinstance(w, dict):
            try:
                week = int(w.get("week") or i)
            except (TypeError, ValueError):
                week = i
            weeks.append({"week": week, "focus": text(w.get("focus")),
                          "tasks": [text(t) for t in as_list(w.get("tasks")) if text(t)]})
    def week_of(t):
        try:
            return int(t.get("week"))
        except (TypeError, ValueError):
            return None

    topics = [{"topic": text(t.get("topic")), "week": week_of(t), "why": text(t.get("why")),
               "how": text(t.get("how"))}
              for t in as_list(guide.get("course_focus_topics")) if isinstance(t, dict) and t.get("topic")]
    return {
        "status_summary": status,
        "strengths": [{"area": text(x.get("area")), "evidence": text(x.get("evidence"))}
                      for x in as_list(advice.get("strengths")) if isinstance(x, dict)],
        "concerns": [{"area": text(x.get("area")), "evidence": text(x.get("evidence")),
                      "severity": _pick(x.get("severity"), ("high", "medium", "low"), "medium")}
                     for x in as_list(advice.get("concerns")) if isinstance(x, dict)],
        "recommendations": recs,
        "improvement_guide": {"weekly_plan": weeks[:4], "course_focus_topics": topics[:5]},
        "other_advice": [text(x) for x in as_list(advice.get("other_advice")) if text(x)],
        "motivation_message": text(advice.get("motivation_message")),
        "progress_message": text(advice.get("progress_message")),
    }


_SNAKE_RE = re.compile(r"\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b")
_ARROW_RE = re.compile(r"\s*(?:→|->)\s*")


def _label_for(name):
    field = FIELDS.get(name)
    return field["label"] if field else name.replace("_", " ")


def _humanise_text(text):
    """Remove technical notation the model may leak into student-facing text:
    'completed_assignments = 2' -> 'completed assignments is 2',
    'risk_trend' -> 'risk trend', '58.0→58.0' -> '58.0 to 58.0'."""
    if not isinstance(text, str) or ("_" not in text and "→" not in text and "->" not in text):
        return text
    text = _ARROW_RE.sub(" to ", text)
    # "field_name = value" -> "field_name is value" (the label pass below renames it)
    text = re.sub(r"\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*=\s*", r"\1 is ", text)
    # bare snake_case names -> plain label (lower-cased unless it starts a sentence)
    def _replace(m):
        label = _label_for(m.group(1))
        i = m.start()
        at_start = i == 0 or m.string[max(0, i - 2):i] in (". ", "! ", "? ", ": ") or m.string[i - 1] == "\n"
        return label if at_start else label[0].lower() + label[1:]
    return _SNAKE_RE.sub(_replace, text)


def humanise_advice(advice):
    """Apply _humanise_text to every student-facing text field (evidence_fields stay technical)."""
    s = advice["status_summary"]
    s["headline"], s["explanation"] = _humanise_text(s["headline"]), _humanise_text(s["explanation"])
    for x in advice["strengths"] + advice["concerns"]:
        x["area"], x["evidence"] = _humanise_text(x["area"]), _humanise_text(x["evidence"])
    for r in advice["recommendations"]:
        for k in ("title", "action", "main_reason", "expected_impact", "timeframe"):
            r[k] = _humanise_text(r[k])
    guide = advice["improvement_guide"]
    for w in guide["weekly_plan"]:
        w["focus"] = _humanise_text(w["focus"])
        w["tasks"] = [_humanise_text(t) for t in w["tasks"]]
    for t in guide["course_focus_topics"]:
        t["why"], t["how"] = _humanise_text(t["why"]), _humanise_text(t["how"])
    advice["other_advice"] = [_humanise_text(x) for x in advice["other_advice"]]
    advice["motivation_message"] = _humanise_text(advice["motivation_message"])
    advice["progress_message"] = _humanise_text(advice["progress_message"])
    return advice


def validate_advice(advice, record):
    """Enforce the FR rules: each recommendation must have a reason backed by real fields."""
    allowed = set(advice_input(record).keys())
    clean = []
    for rec in advice.get("recommendations", []):
        if not rec.get("main_reason", "").strip() or not rec.get("action", "").strip():
            continue
        rec["evidence_fields"] = [f for f in rec.get("evidence_fields", []) if f in allowed]
        clean.append(rec)
    advice["recommendations"] = clean[:6]
    if not clean:
        raise ValueError("Model returned no valid recommendations")
    if not advice["status_summary"]["headline"]:
        raise ValueError("Model returned no status headline")
    return advice


def _call_llm(record, course, signals, progress=None):
    started = time.time()
    advice, meta = llm_client.chat_json(
        SYSTEM_PROMPT, build_user_message(record, course, signals, progress), ADVICE_SCHEMA,
        schema_name="student_advice", max_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "4000")))
    meta["latency_ms"] = int((time.time() - started) * 1000)
    return advice, meta


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------

_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 60 * 60


def _cache_key(record, course, progress=None):
    cfg = llm_client.provider_config()
    raw = json.dumps({"r": advice_input(record), "c": course, "p": PROMPT_VERSION,
                      "pr": cfg["provider"], "m": cfg.get("model"),
                      "h": progress and {k: progress[k] for k in ("overall", "risk_level", "fields")}},
                     sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_advice(record, course, use_cache=True, force_fallback=False, progress=None):
    """
    record must already be normalised (contract.normalise_record).
    progress = progress.compare(previous_record, record) when the student was assessed before.
    """
    signals = detect_signals(record, course) + progress_signals(progress)
    info = llm_client.provider_config()
    meta = {
        "contract_version": CONTRACT_VERSION,
        "prompt_version": PROMPT_VERSION,
        "provider": info["provider"],
        "model": info.get("model"),
        "fields_used": list(advice_input(record).keys()),
        "fields_not_used": [k for k, v in FIELDS.items() if not v["used"]],
        "input_shape": record.get("_source_shape", "flat"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cached": False,
        "fallback_reason": None,
    }

    key = _cache_key(record, course, progress)
    if use_cache and not force_fallback:
        with _cache_lock:
            hit = _cache.get(key)
        if hit and time.time() - hit[0] < CACHE_TTL_SECONDS:
            advice, cached_meta = hit[1]
            return advice, {**cached_meta, "cached": True}, signals

    if force_fallback or not info["configured"]:
        meta["provider"] = "rule_based_fallback"
        meta["model"] = None
        meta["fallback_reason"] = "Forced by request" if force_fallback else info.get("reason")
        return fallback_advice(record, course, signals, progress), meta, signals

    try:
        advice, call_meta = _call_llm(record, course, signals, progress)
        advice = humanise_advice(validate_advice(coerce_advice(advice, record), record))
        meta.update(call_meta)
    except Exception as exc:  # network error, bad key, invalid JSON, etc.
        label = llm_client.PROVIDER_LABELS.get(info["provider"], info["provider"])
        meta["provider"] = "rule_based_fallback"
        meta["model"] = None
        meta["fallback_reason"] = f"{label} call failed: {type(exc).__name__}: {str(exc)[:200]}"
        return fallback_advice(record, course, signals, progress), meta, signals

    with _cache_lock:
        _cache[key] = (time.time(), (advice, meta))
    return advice, meta, signals
