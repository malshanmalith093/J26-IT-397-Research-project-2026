"""MongoDB persistence for student risk records entered through the client app."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path

from pymongo.collection import Collection


BASE_DIR = Path(__file__).resolve().parents[1]
LEGACY_DATABASE_PATH = Path(
    os.getenv("RISK_INPUT_DB", BASE_DIR / "data" / "manual_risk_entries.sqlite3")
)
COLLECTION_NAME = "risk_inputs"
MIGRATION_ID = "manual-risk-inputs-sqlite-to-mongodb-v1"

TEXT_COLUMNS = ("user_id", "student_id", "student_name", "module_id", "module_name")
FEATURE_COLUMNS = (
    "previous_gpa",
    "attendance",
    "assignment_score",
    "quiz_score",
    "study_hours",
    "engagement_score",
    "late_assignments",
    "completed_assignments",
    "learning_progress",
)
RECORD_COLUMNS = TEXT_COLUMNS + FEATURE_COLUMNS


def initialize_risk_store(
    collection: Collection,
    *,
    legacy_mongodb_database=None,
) -> None:
    """Create the unique index and move prior local/MongoDB risk records once."""
    collection.create_index([("user_id", 1), ("module_id", 1)], unique=True)
    if legacy_mongodb_database is not None:
        _move_legacy_mongodb_records(collection, legacy_mongodb_database)
    _migrate_legacy_sqlite_records(collection)


def save_risk_input(collection: Collection, user_id: str, record: dict) -> None:
    values = {column: record.get(column) for column in RECORD_COLUMNS}
    values["user_id"] = user_id
    collection.update_one(
        {"user_id": user_id, "module_id": record["module_id"]},
        {
            "$set": {**values, "updated_at": datetime.utcnow()},
            "$setOnInsert": {"created_at": datetime.utcnow()},
        },
        upsert=True,
    )


def get_risk_inputs(collection: Collection, user_id: str) -> list[dict]:
    return list(
        collection.find(
            {"user_id": user_id},
            {"_id": 0, **{column: 1 for column in RECORD_COLUMNS}},
        ).sort("created_at", 1)
    )


def get_all_risk_inputs(collection: Collection) -> list[dict]:
    """Return all user-owned risk entries for an authorized administrator."""
    return list(
        collection.find(
            {},
            {"_id": 0, **{column: 1 for column in RECORD_COLUMNS}},
        ).sort("created_at", 1)
    )


def _migrate_legacy_sqlite_records(collection: Collection) -> None:
    migrations = collection.database["risk_assessment_migrations"]
    if migrations.find_one({"_id": MIGRATION_ID}):
        return

    if LEGACY_DATABASE_PATH.is_file():
        with sqlite3.connect(LEGACY_DATABASE_PATH) as connection:
            connection.row_factory = sqlite3.Row
            table_exists = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'risk_inputs'"
            ).fetchone()
            if table_exists:
                for row in connection.execute("SELECT * FROM risk_inputs"):
                    legacy = dict(row)
                    user_id = str(legacy.get("user_id", ""))
                    module_id = str(legacy.get("module_id", ""))
                    if not user_id or not module_id:
                        continue
                    record = {column: legacy.get(column) for column in RECORD_COLUMNS}
                    record["user_id"] = user_id
                    record["created_at"] = _parse_timestamp(legacy.get("created_at"))
                    record["updated_at"] = _parse_timestamp(legacy.get("updated_at"))
                    collection.update_one(
                        {"user_id": user_id, "module_id": module_id},
                        {"$setOnInsert": record},
                        upsert=True,
                    )

    migrations.update_one(
        {"_id": MIGRATION_ID},
        {"$setOnInsert": {"completed_at": datetime.utcnow()}},
        upsert=True,
    )


def _move_legacy_mongodb_records(collection: Collection, legacy_database) -> None:
    """Copy old risk data, verify it in the selected DB, then remove old risk-only collections."""
    old_collection = legacy_database[COLLECTION_NAME]
    old_records = list(old_collection.find({}))

    for old_record in old_records:
        user_id = str(old_record.get("user_id", ""))
        module_id = str(old_record.get("module_id", ""))
        if not user_id or not module_id:
            raise ValueError(
                "Cannot move a legacy MongoDB risk record without user_id and module_id; "
                "the original record was left in place."
            )
        old_record.pop("_id", None)
        old_record["user_id"] = user_id
        old_record["module_id"] = module_id
        collection.update_one(
            {"user_id": user_id, "module_id": module_id},
            {"$setOnInsert": old_record},
            upsert=True,
        )

    for old_record in old_records:
        key = {
            "user_id": str(old_record.get("user_id", "")),
            "module_id": str(old_record.get("module_id", "")),
        }
        if not collection.find_one(key, {"_id": 1}):
            raise RuntimeError(
                "Could not verify all legacy MongoDB risk records in the selected database; "
                "the original records were left in place."
            )

    if old_records:
        old_collection.drop()
    if "risk_assessment_migrations" in legacy_database.list_collection_names():
        legacy_database["risk_assessment_migrations"].drop()


def _parse_timestamp(value):
    if not value:
        return datetime.utcnow()
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return datetime.utcnow()
