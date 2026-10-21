"""
MongoDB storage for Component 2 (database: research_db).

Collections
  c1_risk_outputs : Component 1 outputs per user. Dummy records for PP1;
                    the real Component 1 model can write the same shape later.
  c2_advice       : advice delivered to each user (also the audit log).

Every student-facing query filters by the logged-in user's id, so a student
can only ever read their own records.
"""

import threading
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import DESCENDING

_db = None


def init_store(db):
    global _db
    _db = db

    def create_indexes():
        try:
            _db["c2_advice"].create_index([("user_id", 1), ("created_at", DESCENDING)])
            _db["c1_risk_outputs"].create_index([("user_id", 1), ("created_at", DESCENDING)])
        except Exception as exc:  # index creation must not stop the app
            print("Advice index creation skipped:", str(exc)[:300])

    # in the background, so a slow/unreachable database does not delay Flask start-up
    threading.Thread(target=create_indexes, daemon=True).start()


def users():
    return _db["users"]


def _now():
    return datetime.now(timezone.utc)


def pseudonymous_id(user_id):
    """Stable pseudonymous student id used in Component 1 / 2 records."""
    return f"STU-{str(user_id)[-6:].upper()}"


def serialise(doc):
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            v = str(v)
        elif isinstance(v, datetime):
            v = v.replace(tzinfo=v.tzinfo or timezone.utc).isoformat()
        elif isinstance(v, dict):
            v = serialise(v)
        out["id" if k == "_id" else k] = v
    return out


def find_user(user_id=None, email=None):
    query = {}
    if user_id:
        try:
            query["_id"] = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
    elif email:
        query["email"] = str(email).strip().lower()
    else:
        return None
    return users().find_one(query, {"password": 0})


def list_students():
    return list(users().find({"role": {"$nin": ["Admin"]}}, {"password": 0}).sort("name", 1))


def save_c1_output(user_id, record, course_code, sent_by, source="dummy", model_version=None,
                   assessed_at=None, status="sent"):
    """source: 'dummy' (staff on the panel) or 'component1' (pushed by the Component 1 model / simulator).
    status: 'sent' (advice was generated and delivered) or 'pending' (imported, advice to be sent later)."""
    doc = {
        "user_id": str(user_id), "student_id": record["student_id"], "course_code": course_code,
        "record": record, "source": source, "model_version": model_version, "assessed_at": assessed_at,
        "created_by": sent_by["id"], "created_at": _now(), "status": status,
    }
    return _db["c1_risk_outputs"].insert_one(doc).inserted_id


def previous_c1_output(user_id, course_code):
    """Most recent Component 1 output already DELIVERED for this user and course (or None).
    Pending imports are skipped - they have not produced advice yet, so they are not
    part of the student's progress history."""
    return _db["c1_risk_outputs"].find_one(
        {"user_id": str(user_id), "course_code": course_code, "status": {"$ne": "pending"}},
        sort=[("created_at", DESCENDING)])


def pending_c1_outputs(limit=200):
    """Imported Component 1 outputs waiting for the staff to send the advice (newest first)."""
    return list(_db["c1_risk_outputs"].find({"status": "pending"})
                .sort("created_at", DESCENDING).limit(limit))


def c1_output_by_id(c1_id):
    try:
        oid = ObjectId(c1_id)
    except (InvalidId, TypeError):
        return None
    return _db["c1_risk_outputs"].find_one({"_id": oid})


def mark_c1_sent(c1_id, advice_id, sent_by):
    _db["c1_risk_outputs"].update_one(
        {"_id": c1_id if isinstance(c1_id, ObjectId) else ObjectId(c1_id)},
        {"$set": {"status": "sent", "advice_id": advice_id, "sent_at": _now(),
                  "sent_by": {"id": sent_by["id"], "name": sent_by.get("name")}}})


def delete_pending_c1(c1_id):
    """Delete an imported record, but only while it is still pending."""
    try:
        oid = ObjectId(c1_id)
    except (InvalidId, TypeError):
        return False
    return _db["c1_risk_outputs"].delete_one({"_id": oid, "status": "pending"}).deleted_count > 0


def save_advice(user_id, result, c1_output_id, sent_by, source="dummy"):
    doc = {
        "user_id": str(user_id),
        "student_id": result["student_id"],
        "course_code": result["course"]["code"],
        "course": result["course"],
        "input": result["input"],
        "signals": result["signals"],
        "progress": result.get("progress"),
        "advice": result["advice"],
        "meta": result["meta"],
        "warnings": result.get("warnings", []),
        "c1_output_id": c1_output_id,
        "source": source,
        "sent_by": {"id": sent_by["id"], "name": sent_by.get("name")},
        "created_at": _now(),
        "read_at": None,
    }
    return _db["c2_advice"].insert_one(doc).inserted_id


def overview(limit=8):
    """Numbers + recent events for the staff dashboard."""
    from datetime import timedelta
    advice = _db["c2_advice"]
    latest = latest_advice_summary_by_user()
    since = _now() - timedelta(days=1)
    recent = list(advice.find({}, {"user_id": 1, "course_code": 1, "created_at": 1, "source": 1, "read_at": 1,
                                   "input.academic_risk_level": 1, "progress.overall": 1,
                                   "advice.status_summary.overall_status": 1, "sent_by": 1})
                  .sort("created_at", DESCENDING).limit(limit))
    names = {str(u["_id"]): u.get("name") for u in users().find(
        {"_id": {"$in": [ObjectId(r["user_id"]) for r in recent if ObjectId.is_valid(r["user_id"])]}}, {"name": 1})}
    return {
        "students": users().count_documents({"role": {"$nin": ["Admin"]}}),
        "advice_total": advice.count_documents({}),
        "advice_last_24h": advice.count_documents({"created_at": {"$gte": since}}),
        "pending_imports": _db["c1_risk_outputs"].count_documents({"status": "pending"}),
        "from_component1": advice.count_documents({"source": "component1"}),
        "unread": advice.count_documents({"read_at": None}),
        "latest_status": {s: sum(1 for v in latest.values() if v.get("overall_status") == s)
                          for s in ("at_risk", "needs_attention", "on_track")},
        "recent": [{
            "id": str(r["_id"]), "user_id": r["user_id"], "name": names.get(r["user_id"]),
            "course_code": r.get("course_code"), "source": r.get("source", "dummy"),
            "risk_level": (r.get("input") or {}).get("academic_risk_level"),
            "overall_status": ((r.get("advice") or {}).get("status_summary") or {}).get("overall_status"),
            "progress": (r.get("progress") or {}).get("overall"),
            "read": r.get("read_at") is not None,
            "created_at": serialise({"t": r["created_at"]})["t"],
        } for r in recent],
    }


def advice_for_user(user_id, limit=30):
    """All advice for ONE user, newest first."""
    return list(_db["c2_advice"].find({"user_id": str(user_id)}).sort("created_at", DESCENDING).limit(limit))


def advice_by_id_for_user(advice_id, user_id):
    try:
        oid = ObjectId(advice_id)
    except (InvalidId, TypeError):
        return None
    return _db["c2_advice"].find_one({"_id": oid, "user_id": str(user_id)})


def mark_read(advice_id, user_id):
    try:
        oid = ObjectId(advice_id)
    except (InvalidId, TypeError):
        return False
    res = _db["c2_advice"].update_one({"_id": oid, "user_id": str(user_id), "read_at": None},
                                      {"$set": {"read_at": _now()}})
    return res.matched_count > 0


def latest_advice_summary_by_user():
    """{user_id: summary of their most recent advice} for the staff list."""
    out = {}
    cursor = _db["c2_advice"].find(
        {}, {"user_id": 1, "course_code": 1, "created_at": 1, "read_at": 1,
             "input.academic_risk_level": 1, "advice.status_summary.overall_status": 1}
    ).sort("created_at", DESCENDING)
    for doc in cursor:
        uid = doc["user_id"]
        entry = out.setdefault(uid, {"count": 0})
        entry["count"] += 1
        if entry["count"] == 1:
            entry.update({
                "advice_id": str(doc["_id"]),
                "course_code": doc.get("course_code"),
                "risk_level": doc.get("input", {}).get("academic_risk_level"),
                "overall_status": doc.get("advice", {}).get("status_summary", {}).get("overall_status"),
                "sent_at": serialise({"t": doc["created_at"]})["t"],
                "read": doc.get("read_at") is not None,
            })
    return out
