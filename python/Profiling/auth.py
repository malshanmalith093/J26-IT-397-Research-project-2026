"""
Authentication helper for the advice routes.

The client may log in through either backend, and both sign with the same
JWT_SECRET and use the same research_db.users collection:
  * Node/Express token payload:  {"user": {"id": "...", "role": "..."}}
  * Flask token payload:         {"user_id": "...", "email": "..."}
Both are accepted here. The role is read from the token when present
(Node includes group-moderator status), otherwise from the users collection.
"""

import os
from functools import wraps

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from flask import g, jsonify, request

STAFF_ROLES = {"admin", "moderator"}

_users = None


def init_auth(users_collection):
    global _users
    _users = users_collection


def _decode(token):
    payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
    if isinstance(payload.get("user"), dict):  # Node token
        return payload["user"].get("id"), payload["user"].get("role")
    return payload.get("user_id"), payload.get("role")  # Flask token


def current_user():
    """Return {"id", "name", "email", "role"} for the request's token, or None."""
    token = request.headers.get("x-auth-token") or ""
    if token.lower().startswith("bearer "):
        token = token[7:]
    if not token:
        return None
    try:
        user_id, token_role = _decode(token)
        doc = _users.find_one({"_id": ObjectId(user_id)}, {"password": 0}) if _users is not None else None
    except (jwt.InvalidTokenError, InvalidId, TypeError):
        return None
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "role": token_role or doc.get("role") or "Student",
    }


def is_staff(user):
    return bool(user) and (user.get("role") or "").lower() in STAFF_ROLES


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"message": "Please log in again (missing or invalid token)."}), 401
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def staff_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"message": "Please log in again (missing or invalid token)."}), 401
        if not is_staff(user):
            return jsonify({"message": "Only Admin / Moderator users can do this."}), 403
        g.user = user
        return fn(*args, **kwargs)
    return wrapper
