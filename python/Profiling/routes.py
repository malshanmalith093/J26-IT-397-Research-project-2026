"""
Flask routes for the Component 2 advice engine.

Reference data (logged-in users)
  GET  /api/advice/health            provider / model status
  GET  /api/advice/whoami            current user + whether they are staff
  GET  /api/advice/contract          Component 1 -> 2 field contract
  GET  /api/advice/courses           course context (dummy for PP1)
  GET  /api/advice/dummy-students    dummy Component 1 output templates

Student (own data only - the user id always comes from the token)
  GET  /api/advice/my                my latest advice + history
  GET  /api/advice/my/<advice_id>    one of my advice records
  POST /api/advice/my/<advice_id>/read

Staff (Admin / Moderator) - simulate Component 1 and send advice to users
  GET  /api/advice/admin/students            users + summary of last advice sent
  GET  /api/advice/admin/students/<user_id>  advice history of one user
  POST /api/advice/admin/send                send advice to one or many users
  POST /api/advice/admin/import              save Component 1 records WITHOUT sending (pending)
  GET  /api/advice/admin/pending             imported records waiting to be sent
  POST /api/advice/admin/pending/send        generate + send advice for pending records
  DELETE /api/advice/admin/pending/<id>      discard a pending record
  POST /api/advice/admin/llm-test            test the configured LLM provider
  GET  /api/advice/admin/overview            dashboard numbers + recent advice

Component 1 -> Component 2 (service key, see bottom of file)
  GET  /api/advice/c1/students               registered students
  POST /api/advice/c1/ingest                 push Component 1 output(s); advice is generated and delivered
  POST /api/advice/parse                     validate CSV / JSON dummy data
  POST /api/advice/generate                  preview advice without sending
"""

import csv
import io
import json
from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, g, jsonify, request

from . import store
from . import llm_client
from .advisor import generate_advice, provider_info
from .auth import init_auth, is_staff, login_required, staff_required
from .contract import C1_CORE_FIELDS, FIELDS, normalise_record, public_contract
from .courses import course_context, get_course, list_courses
from .dummy_data import APPENDIX4_EXAMPLE, DEFAULT_COURSE, DUMMY_STUDENTS
from .progress import compare
from .signals import LOWER_IS_WORSE

advice_bp = Blueprint("advice", __name__, url_prefix="/api/advice")

MAX_SEND = 50


def init_advice(db):
    """Call once from app.py with the research_db database."""
    store.init_store(db)
    init_auth(db["users"])


def _course(code):
    return course_context(code or DEFAULT_COURSE)


def _build_result(raw, course_code, use_cache=True, force_fallback=False, previous=None):
    """previous = the student's previous Component 1 output document for this course (or None)."""
    record, errors, warnings = normalise_record(raw)
    if errors:
        return {"ok": False, "student_id": raw.get("student_id") if isinstance(raw, dict) else None,
                "errors": errors, "warnings": warnings}
    course = _course(course_code)
    progress = None
    if previous:
        prev_at = previous.get("assessed_at") or store.serialise({"t": previous.get("created_at")})["t"]
        progress = compare(previous.get("record") or {}, record, prev_at)
    advice, meta, signals = generate_advice(record, course, use_cache=use_cache,
                                            force_fallback=force_fallback, progress=progress)
    return {
        "ok": True,
        "student_id": record["student_id"],
        "course": {"code": course["code"], "name": course["name"],
                   "current_week": course["current_week"], "total_weeks": course["total_weeks"],
                   "expected_progress": course["expected_progress"],
                   "assignments_released": course["assignments_released"]},
        "input": {k: v for k, v in record.items() if not k.startswith("_")},
        "signals": signals,
        "progress": progress,
        "advice": advice,
        "meta": meta,
        "warnings": warnings,
    }


# --------------------------------------------------------------------------
# Reference data
# --------------------------------------------------------------------------

@advice_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "component": "C2-advice-engine", **provider_info()})


@advice_bp.route("/whoami", methods=["GET"])
@login_required
def whoami():
    return jsonify({**g.user, "is_staff": is_staff(g.user),
                    "student_id": store.pseudonymous_id(g.user["id"])})


@advice_bp.route("/contract", methods=["GET"])
@login_required
def contract():
    targets = {field: limits[1] for field, limits in LOWER_IS_WORSE.items()}
    return jsonify({**public_contract(), "targets": targets, "appendix4_example": APPENDIX4_EXAMPLE})


@advice_bp.route("/courses", methods=["GET"])
@login_required
def courses():
    """Compact course list for the advice tools (full content is under /api/courses)."""
    return jsonify([course_context(c["code"]) for c in list_courses()])


@advice_bp.route("/dummy-students", methods=["GET"])
@staff_required
def dummy_students():
    return jsonify(DUMMY_STUDENTS)


# --------------------------------------------------------------------------
# Student: my advice only
# --------------------------------------------------------------------------

@advice_bp.route("/my", methods=["GET"])
@login_required
def my_advice():
    docs = store.advice_for_user(g.user["id"])
    latest_by_course = {}
    for d in docs:
        latest_by_course.setdefault(d["course_code"], d)
    return jsonify({
        "user": {"name": g.user["name"], "student_id": store.pseudonymous_id(g.user["id"])},
        "latest": [store.serialise(d) for d in latest_by_course.values()],
        "history": [{
            "id": str(d["_id"]), "course_code": d["course_code"],
            "risk_level": d["input"].get("academic_risk_level"),
            "overall_status": d["advice"]["status_summary"]["overall_status"],
            "headline": d["advice"]["status_summary"]["headline"],
            "created_at": store.serialise({"t": d["created_at"]})["t"],
            "read": d.get("read_at") is not None,
        } for d in docs],
        "unread": sum(1 for d in docs if d.get("read_at") is None),
    })


@advice_bp.route("/my/<advice_id>", methods=["GET"])
@login_required
def my_advice_one(advice_id):
    doc = store.advice_by_id_for_user(advice_id, g.user["id"])
    if not doc:
        return jsonify({"message": "Advice not found"}), 404
    return jsonify(store.serialise(doc))


@advice_bp.route("/my/<advice_id>/read", methods=["POST"])
@login_required
def my_advice_read(advice_id):
    store.mark_read(advice_id, g.user["id"])
    return jsonify({"ok": True})


# --------------------------------------------------------------------------
# Staff: simulate Component 1 output and send advice to users
# --------------------------------------------------------------------------

@advice_bp.route("/admin/students", methods=["GET"])
@staff_required
def admin_students():
    summary = store.latest_advice_summary_by_user()
    out = []
    for u in store.list_students():
        uid = str(u["_id"])
        out.append({"id": uid, "name": u.get("name"), "email": u.get("email"), "role": u.get("role"),
                    "student_id": store.pseudonymous_id(uid), "last_advice": summary.get(uid)})
    return jsonify(out)


@advice_bp.route("/admin/students/<user_id>", methods=["GET"])
@staff_required
def admin_student_advice(user_id):
    user = store.find_user(user_id=user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    docs = store.advice_for_user(user_id)
    return jsonify({"user": {"id": user_id, "name": user.get("name"), "email": user.get("email")},
                    "advice": [store.serialise(d) for d in docs]})


def _deliver(user, raw, course_code, sender, force_fallback=False, source="dummy",
             model_version=None, assessed_at=None):
    """Validate one Component 1 output, generate advice and store it for that user only."""
    uid = str(user["_id"])
    raw = dict(raw or {})
    # The record always belongs to the target user (pseudonymous id)
    raw["student_id"] = store.pseudonymous_id(uid)
    course_code = (course_code or raw.pop("course_code", None) or DEFAULT_COURSE).upper()
    if not get_course(course_code, fallback_to_samples=True):
        return {"ok": False, "target": user.get("email"), "name": user.get("name"),
                "errors": [f"Unknown course '{course_code}'. Add it on the Courses page first."]}

    previous = store.previous_c1_output(uid, course_code)
    result = _build_result(raw, course_code, force_fallback=force_fallback, previous=previous)
    if not result["ok"]:
        return {"ok": False, "target": user.get("email"), "name": user.get("name"), "errors": result["errors"]}

    c1_id = store.save_c1_output(uid, result["input"], result["course"]["code"], sender, source=source,
                                 model_version=model_version, assessed_at=assessed_at)
    advice_id = store.save_advice(uid, result, c1_id, sender, source=source)
    progress = result.get("progress") or {}
    return {"ok": True, "user_id": uid, "name": user.get("name"), "email": user.get("email"),
            "advice_id": str(advice_id), "course_code": result["course"]["code"],
            "risk_level": result["input"]["academic_risk_level"],
            "overall_status": result["advice"]["status_summary"]["overall_status"],
            "headline": result["advice"]["status_summary"]["headline"],
            "progress": progress.get("overall"), "progress_message": result["advice"].get("progress_message"),
            "provider": result["meta"]["provider"], "model": result["meta"].get("model"),
            "fallback_reason": result["meta"]["fallback_reason"]}


def _send_one(item, sender, force_fallback):
    """item = {"user_id" or "email", "record": {...}, "course_code": "..."}"""
    user = store.find_user(user_id=item.get("user_id"), email=item.get("email"))
    who = item.get("user_id") or item.get("email")
    if not user:
        return {"ok": False, "target": who, "errors": [f"No user found for '{who}'."]}
    return _deliver(user, item.get("record"), item.get("course_code"), sender, force_fallback)


def _import_one(item, sender):
    """Validate one Component 1 output and save it as PENDING - no advice is generated."""
    user = store.find_user(user_id=item.get("user_id"), email=item.get("email"))
    who = item.get("user_id") or item.get("email")
    if not user:
        return {"ok": False, "target": who, "errors": [f"No user found for '{who}'."]}
    uid = str(user["_id"])
    raw = dict(item.get("record") or {})
    raw["student_id"] = store.pseudonymous_id(uid)
    course_code = (item.get("course_code") or raw.pop("course_code", None) or DEFAULT_COURSE).upper()
    if not get_course(course_code, fallback_to_samples=True):
        return {"ok": False, "target": user.get("email"), "name": user.get("name"),
                "errors": [f"Unknown course '{course_code}'. Add it on the Courses page first."]}
    record, errors, warnings = normalise_record(raw)
    if errors:
        return {"ok": False, "target": user.get("email"), "name": user.get("name"), "errors": errors}
    clean = {k: v for k, v in record.items() if not k.startswith("_")}
    c1_id = store.save_c1_output(uid, clean, course_code, sender, status="pending")
    return {"ok": True, "user_id": uid, "name": user.get("name"), "email": user.get("email"),
            "pending_id": str(c1_id), "course_code": course_code,
            "risk_level": clean["academic_risk_level"], "warnings": warnings}


@advice_bp.route("/admin/import", methods=["POST"])
@staff_required
def admin_import():
    """Like /admin/send, but only stores the Component 1 records; the advice is sent later
    from the Pending list. Body: {"items": [{"user_id"|"email", "record": {...}, "course_code"}]}"""
    body = request.get_json(silent=True) or {}
    items = body.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"message": "Body must contain a non-empty 'items' list"}), 400
    if len(items) > MAX_SEND:
        return jsonify({"message": f"Maximum {MAX_SEND} records per request"}), 400
    results = [_import_one(it, g.user) for it in items]
    return jsonify({"count": len(results), "imported": sum(r["ok"] for r in results), "results": results})


@advice_bp.route("/admin/pending", methods=["GET"])
@staff_required
def admin_pending():
    docs = store.pending_c1_outputs()
    users_by_id = {}
    for d in docs:
        uid = d["user_id"]
        if uid not in users_by_id:
            u = store.find_user(user_id=uid)
            users_by_id[uid] = {"name": u.get("name"), "email": u.get("email")} if u else {}
    return jsonify([{
        "id": str(d["_id"]), "user_id": d["user_id"],
        "name": users_by_id[d["user_id"]].get("name"), "email": users_by_id[d["user_id"]].get("email"),
        "course_code": d.get("course_code"), "source": d.get("source", "dummy"),
        "risk_level": (d.get("record") or {}).get("academic_risk_level"),
        "record": d.get("record"),
        "imported_at": store.serialise({"t": d["created_at"]})["t"],
        "imported_by": d.get("created_by"),
    } for d in docs])


def _send_pending_one(pending_id, sender, force_fallback):
    doc = store.c1_output_by_id(pending_id)
    if not doc or doc.get("status") != "pending":
        return {"ok": False, "target": str(pending_id), "errors": ["Pending record not found (already sent or deleted?)."]}
    user = store.find_user(user_id=doc["user_id"])
    if not user:
        return {"ok": False, "target": str(pending_id), "errors": ["The student no longer exists."]}
    previous = store.previous_c1_output(doc["user_id"], doc["course_code"])
    result = _build_result(dict(doc["record"]), doc["course_code"], force_fallback=force_fallback, previous=previous)
    if not result["ok"]:
        return {"ok": False, "target": user.get("email"), "name": user.get("name"), "errors": result["errors"]}
    advice_id = store.save_advice(doc["user_id"], result, doc["_id"], sender, source=doc.get("source", "dummy"))
    store.mark_c1_sent(doc["_id"], advice_id, sender)
    return {"ok": True, "user_id": doc["user_id"], "name": user.get("name"), "email": user.get("email"),
            "advice_id": str(advice_id), "pending_id": str(doc["_id"]), "course_code": result["course"]["code"],
            "risk_level": result["input"]["academic_risk_level"],
            "overall_status": result["advice"]["status_summary"]["overall_status"],
            "headline": result["advice"]["status_summary"]["headline"],
            "provider": result["meta"]["provider"], "model": result["meta"].get("model"),
            "fallback_reason": result["meta"]["fallback_reason"]}


@advice_bp.route("/admin/pending/send", methods=["POST"])
@staff_required
def admin_pending_send():
    """Body: {"ids": ["<pending_id>", ...], "force_fallback": false} - generates and delivers
    the advice for records that were imported earlier."""
    body = request.get_json(silent=True) or {}
    ids = body.get("ids")
    if not isinstance(ids, list) or not ids:
        return jsonify({"message": "Body must contain a non-empty 'ids' list"}), 400
    if len(ids) > MAX_SEND:
        return jsonify({"message": f"Maximum {MAX_SEND} records per request"}), 400
    sender = g.user
    force_fallback = bool(body.get("force_fallback"))
    # in order: if several pendings exist for the same student+course, each send becomes
    # the "previous" of the next one, so progress comparison stays correct
    results = [_send_pending_one(i, sender, force_fallback) for i in ids]
    return jsonify({"count": len(results), "sent": sum(r["ok"] for r in results), "results": results})


@advice_bp.route("/admin/pending/<pending_id>", methods=["DELETE"])
@staff_required
def admin_pending_delete(pending_id):
    if not store.delete_pending_c1(pending_id):
        return jsonify({"message": "Pending record not found (already sent or deleted?)."}), 404
    return jsonify({"ok": True})


@advice_bp.route("/admin/overview", methods=["GET"])
@staff_required
def admin_overview():
    return jsonify(store.overview())


@advice_bp.route("/admin/llm-test", methods=["POST"])
@staff_required
def admin_llm_test():
    """Small round-trip to check the configured LLM provider (no student data is sent)."""
    info = provider_info()
    if not info["configured"]:
        return jsonify({"ok": False, **info, "error": info.get("reason")})
    try:
        return jsonify({**info, **llm_client.test_connection()})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, **info, "error": f"{type(exc).__name__}: {str(exc)[:400]}"})


@advice_bp.route("/admin/send", methods=["POST"])
@staff_required
def admin_send():
    """Body: {"items": [{"user_id"|"email", "record": {...C1 output...}, "course_code"}], "force_fallback": false}"""
    body = request.get_json(silent=True) or {}
    items = body.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"message": "Body must contain a non-empty 'items' list"}), 400
    if len(items) > MAX_SEND:
        return jsonify({"message": f"Maximum {MAX_SEND} users per request"}), 400

    sender = g.user
    force_fallback = bool(body.get("force_fallback"))
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda it: _send_one(it, sender, force_fallback), items))
    return jsonify({"count": len(results), "sent": sum(r["ok"] for r in results), "results": results})


@advice_bp.route("/parse", methods=["POST"])
@staff_required
def parse_records():
    """Body: {"text": "<JSON or CSV>"} -> validated rows. Rows are routed to users by email or user_id."""
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"message": "No data provided"}), 400

    if text[0] in "[{":
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            return jsonify({"message": f"Invalid JSON: {exc}"}), 400
        rows = data if isinstance(data, list) else [data]
    else:
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            return jsonify({"message": "CSV has no header row"}), 400
        reader.fieldnames = [h.strip().lower().replace(" ", "_") for h in reader.fieldnames]
        rows = [dict(r) for r in reader]
    if len(rows) > 200:
        return jsonify({"message": "Too many rows (max 200)"}), 400

    out = []
    for i, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            out.append({"row": i, "ok": False, "errors": ["Row is not an object"], "warnings": []})
            continue
        email = (row.pop("email", None) or "").strip().lower() or None
        user_id = (row.pop("user_id", None) or "").strip() or None
        course_code = (row.pop("course_code", None) or "").strip().upper() or None
        raw = row.get("record", row)
        user = store.find_user(user_id=user_id, email=email)
        # student_id is replaced by the user's pseudonymous id when sending
        record, errors, warnings = normalise_record({**raw, "student_id": raw.get("student_id") or "pending"})
        if not user:
            errors = errors + [f"No registered user for '{email or user_id or '(no email column)'}'."]
        out.append({
            "row": i, "ok": not errors, "errors": errors, "warnings": warnings,
            "email": user.get("email") if user else email, "name": user.get("name") if user else None,
            "user_id": str(user["_id"]) if user else None, "course_code": course_code,
            "record": None if record is None else {k: v for k, v in record.items() if not k.startswith("_")},
        })
    return jsonify({"count": len(out), "valid": sum(r["ok"] for r in out), "rows": out})


@advice_bp.route("/generate", methods=["POST"])
@staff_required
def generate_preview():
    """Preview advice for a record without saving or sending it."""
    body = request.get_json(silent=True) or {}
    if "record" not in body:
        return jsonify({"message": "Body must contain 'record'", "c1_fields": C1_CORE_FIELDS,
                        "required_fields": [k for k, v in FIELDS.items() if v["required"]]}), 400
    raw = {"student_id": "PREVIEW", **body["record"]}
    result = _build_result(raw, body.get("course_code"), use_cache=not body.get("refresh", False),
                           force_fallback=bool(body.get("force_fallback")))
    return jsonify(result), (200 if result["ok"] else 422)


# --------------------------------------------------------------------------
# Component 1 -> Component 2 (machine-to-machine)
# --------------------------------------------------------------------------
# The Component 1 model (or the simulator scripts in python/component1_simulator)
# pushes each new prediction here. Component 2 then generates the advice and
# delivers it to that student automatically - no staff action needed.
#
# Auth: header "X-C1-API-Key" must equal C1_API_KEY in python/.env.
# If C1_API_KEY is not set, only requests from this computer (localhost) are accepted.

import hmac
import os

C1_SENDER = {"id": "component1", "name": "Component 1 model (automatic)"}


def _c1_authorised():
    expected = os.getenv("C1_API_KEY", "").strip()
    given = (request.headers.get("X-C1-API-Key") or "").strip()
    if expected:
        return hmac.compare_digest(given, expected)
    return request.remote_addr in ("127.0.0.1", "::1", "localhost")


def _c1_guard():
    if not _c1_authorised():
        return jsonify({"message": "Component 1 key missing or wrong (header X-C1-API-Key must match "
                                   "C1_API_KEY in python/.env)"}), 401
    return None


@advice_bp.route("/c1/students", methods=["GET"])
def c1_students():
    """Lets Component 1 (or the simulators) look up registered students to send outputs for."""
    denied = _c1_guard()
    if denied:
        return denied
    return jsonify([{"email": u.get("email"), "name": u.get("name"),
                     "student_id": store.pseudonymous_id(u["_id"])} for u in store.list_students()])


@advice_bp.route("/c1/ingest", methods=["POST"])
def c1_ingest():
    """
    One output:  {"student_email": "...", "course_code": "IT1010", "output": {...C1 fields...},
                  "model_version": "risk-model-v1", "assessed_at": "ISO-8601"}
    Several:     {"outputs": [ <one output>, ... ]}
    "output" may be the flat record or the Appendix 4 payload. "user_id" can replace "student_email".
    """
    denied = _c1_guard()
    if denied:
        return denied
    body = request.get_json(silent=True) or {}
    items = body.get("outputs") if isinstance(body.get("outputs"), list) else [body]
    if not items or len(items) > MAX_SEND:
        return jsonify({"message": f"Send between 1 and {MAX_SEND} outputs"}), 400

    def one(item):
        if not isinstance(item, dict):
            return {"ok": False, "errors": ["Output must be a JSON object"]}
        who = item.get("student_email") or item.get("email") or item.get("user_id")
        user = store.find_user(user_id=item.get("user_id"), email=item.get("student_email") or item.get("email"))
        if not user:
            return {"ok": False, "target": who, "errors": [f"No registered student for '{who}'."]}
        output = item.get("output") or item.get("record")
        if not isinstance(output, dict):
            return {"ok": False, "target": who, "errors": ["'output' (the Component 1 result) is required."]}
        return _deliver(user, output, item.get("course_code"), C1_SENDER, source="component1",
                        model_version=item.get("model_version") or output.get("model_version"),
                        assessed_at=item.get("assessed_at") or output.get("timestamp"))

    results = [one(it) for it in items]  # in order, so progress compares with the previous output
    status = 200 if any(r["ok"] for r in results) else 422
    if not isinstance(body.get("outputs"), list):
        return jsonify(results[0]), status
    return jsonify({"count": len(results), "delivered": sum(r["ok"] for r in results), "results": results}), status
