"""
Course content (MongoDB research_db.c2_courses).

  GET    /api/courses              list of courses (any logged-in user)
  GET    /api/courses/<code>       full course with lessons (any logged-in user)
  POST   /api/courses              create a course            (Admin / Moderator)
  PUT    /api/courses/<code>       update a course            (Admin / Moderator)
  DELETE /api/courses/<code>       delete a course            (Admin / Moderator)
  POST   /api/courses/restore-samples  re-insert the 3 sample courses (Admin / Moderator)

The advice engine reads the current course from here (course_context), so the
improvement guide can point students to real lessons.
"""

import copy
import re
import threading
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from .auth import login_required, staff_required
from .course_seed import DEFAULT_COURSE_CODE, SEED_COURSES

courses_bp = Blueprint("courses", __name__, url_prefix="/api/courses")

_col = None
CODE_RE = re.compile(r"^[A-Z0-9]{3,12}$")


def init_courses(db, seed=True, background=True):
    """Call once from app.py. Seeds the sample courses (in the background) if the collection is empty."""
    global _col
    _col = db["c2_courses"]

    def setup():
        try:
            _col.create_index("code", unique=True)
            if seed and _col.count_documents({}) == 0:
                now = datetime.now(timezone.utc)
                _col.insert_many([{**copy.deepcopy(c), "created_at": now, "updated_at": now,
                                   "created_by": "seed"} for c in SEED_COURSES])
                print("Inserted 3 sample courses into c2_courses")
        except Exception as exc:  # never block start-up
            print("Course setup skipped:", str(exc)[:300])

    if background:
        threading.Thread(target=setup, daemon=True).start()
    else:
        setup()


def _clean(doc):
    if not doc:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    for k in ("created_at", "updated_at"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()
    return doc


def list_courses():
    """Courses from MongoDB; the built-in samples are used only if the database is unavailable."""
    try:
        if _col is None:
            raise RuntimeError("courses not initialised")
        return [_clean(d) for d in _col.find({}, {"_id": 0}).sort("code", 1)]
    except Exception:
        return copy.deepcopy(SEED_COURSES)


def get_course(code, fallback_to_samples=False):
    code = (code or "").upper()
    try:
        doc = _col.find_one({"code": code}) if _col is not None else None
        db_ok = _col is not None
    except Exception:
        doc, db_ok = None, False
    if doc:
        return _clean(doc)
    if fallback_to_samples or not db_ok:
        return next((copy.deepcopy(c) for c in SEED_COURSES if c["code"] == code), None)
    return None


def course_context(code=None):
    """Compact course info used by the advice engine and rules."""
    course = (get_course(code, fallback_to_samples=True)
              or get_course(DEFAULT_COURSE_CODE, fallback_to_samples=True) or SEED_COURSES[0])
    return context_from_doc(course)


def context_from_doc(course):
    return {
        "code": course["code"],
        "name": course["name"],
        "current_week": int(course.get("current_week") or 1),
        "total_weeks": int(course.get("total_weeks") or len(course.get("lessons", [])) or 1),
        "assignments_released": int(course.get("assignments_released") or 0),
        "expected_progress": int(course.get("expected_progress") or 0),
        "upcoming": list(course.get("upcoming") or []),
        "topics": [{"week": int(l.get("week") or i + 1), "title": l.get("title", ""),
                    "summary": l.get("summary", "")}
                   for i, l in enumerate(course.get("lessons") or [])],
    }


# --------------------------------------------------------------------------
# Validation for admin edits
# --------------------------------------------------------------------------

def _int(value, name, lo, hi, errors, default=None):
    if value in (None, ""):
        return default
    try:
        v = int(value)
    except (TypeError, ValueError):
        errors.append(f"{name} must be a whole number")
        return default
    if not lo <= v <= hi:
        errors.append(f"{name} must be between {lo} and {hi}")
    return v


def _str_list(value):
    if isinstance(value, str):
        value = [x for x in value.split("\n")]
    return [str(x).strip() for x in (value or []) if str(x).strip()]


def validate_course(body, code_from_url=None):
    errors = []
    code = (code_from_url or body.get("code") or "").strip().upper()
    if not CODE_RE.match(code):
        errors.append("Course code must be 3-12 letters/numbers, e.g. IT1010")
    name = (body.get("name") or "").strip()
    if not name:
        errors.append("Course name is required")

    lessons = []
    for i, raw in enumerate(body.get("lessons") or [], start=1):
        if not isinstance(raw, dict):
            errors.append(f"Lesson {i} is not valid")
            continue
        title = (raw.get("title") or "").strip()
        if not title:
            errors.append(f"Lesson {i}: title is required")
        example = raw.get("example") or {}
        lessons.append({
            "week": _int(raw.get("week"), f"Lesson {i} week", 1, 52, errors, default=i),
            "title": title,
            "summary": (raw.get("summary") or "").strip(),
            "content": (raw.get("content") or "").strip(),
            "objectives": _str_list(raw.get("objectives")),
            "key_points": _str_list(raw.get("key_points")),
            "example": {"language": (example.get("language") or "text").strip(),
                        "code": (example.get("code") or "").rstrip()} if isinstance(example, dict) else
                       {"language": "text", "code": ""},
            "practice": _str_list(raw.get("practice")),
            "resources": [{"title": (r.get("title") or r.get("url") or "").strip(), "url": (r.get("url") or "").strip()}
                          for r in (raw.get("resources") or []) if isinstance(r, dict) and (r.get("url") or "").strip()],
        })
    lessons.sort(key=lambda l: l["week"])

    total_weeks = _int(body.get("total_weeks"), "Total weeks", 1, 52, errors, default=max(len(lessons), 1))
    course = {
        "code": code,
        "name": name,
        "description": (body.get("description") or "").strip(),
        "level": (body.get("level") or "").strip(),
        "credits": _int(body.get("credits"), "Credits", 0, 30, errors, default=0),
        "lecturer": (body.get("lecturer") or "").strip(),
        "total_weeks": total_weeks,
        "current_week": _int(body.get("current_week"), "Current week", 1, 52, errors, default=1),
        "expected_progress": _int(body.get("expected_progress"), "Expected progress", 0, 100, errors, default=0),
        "assignments_released": _int(body.get("assignments_released"), "Assignments released", 0, 50, errors, default=0),
        "upcoming": _str_list(body.get("upcoming")),
        "lessons": lessons,
    }
    if course["current_week"] and total_weeks and course["current_week"] > total_weeks:
        errors.append("Current week cannot be after the last week")
    return course, errors


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------

@courses_bp.route("", methods=["GET"])
@login_required
def courses_list():
    out = []
    for c in list_courses():
        lessons = c.get("lessons") or []
        out.append({k: c.get(k) for k in ("code", "name", "description", "level", "credits", "lecturer",
                                          "total_weeks", "current_week", "expected_progress",
                                          "assignments_released", "upcoming", "updated_at")}
                   | {"lesson_count": len(lessons),
                      "lessons": [{"week": l.get("week"), "title": l.get("title")} for l in lessons]})
    return jsonify(out)


@courses_bp.route("/<code>", methods=["GET"])
@login_required
def courses_get(code):
    course = get_course(code)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    return jsonify(course)


@courses_bp.route("", methods=["POST"])
@staff_required
def courses_create():
    course, errors = validate_course(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"message": "Please fix the course details", "errors": errors}), 422
    if _col.find_one({"code": course["code"]}):
        return jsonify({"message": f"Course {course['code']} already exists"}), 409
    now = datetime.now(timezone.utc)
    _col.insert_one({**course, "created_at": now, "updated_at": now, "created_by": g.user["id"]})
    return jsonify(get_course(course["code"])), 201


@courses_bp.route("/<code>", methods=["PUT"])
@staff_required
def courses_update(code):
    code = code.upper()
    if not _col.find_one({"code": code}):
        return jsonify({"message": "Course not found"}), 404
    course, errors = validate_course(request.get_json(silent=True) or {}, code_from_url=code)
    if errors:
        return jsonify({"message": "Please fix the course details", "errors": errors}), 422
    _col.update_one({"code": code}, {"$set": {**course, "updated_at": datetime.now(timezone.utc),
                                              "updated_by": g.user["id"]}})
    return jsonify(get_course(code))


@courses_bp.route("/<code>", methods=["DELETE"])
@staff_required
def courses_delete(code):
    res = _col.delete_one({"code": code.upper()})
    if not res.deleted_count:
        return jsonify({"message": "Course not found"}), 404
    return jsonify({"ok": True})


@courses_bp.route("/restore-samples", methods=["POST"])
@staff_required
def courses_restore():
    now = datetime.now(timezone.utc)
    restored = []
    for c in SEED_COURSES:
        if not _col.find_one({"code": c["code"]}):
            _col.insert_one({**copy.deepcopy(c), "created_at": now, "updated_at": now, "created_by": "seed"})
            restored.append(c["code"])
    return jsonify({"restored": restored})
