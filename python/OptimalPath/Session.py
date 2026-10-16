import os
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient, DESCENDING
from pymongo.errors import PyMongoError

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["research_db"]
students_collection = db["students"]


def create_new_session(
    student_id,
    module_id,
    task_id=None,
    task_name=None,
    task_type="quiz",
    quiz_percentage=None,
    assignment_percentage=None,
    attempts_taken=0
):
   

    if not student_id or not module_id:
        return {
            "success": False,
            "error": "Student ID and module ID are required."
        }

    if task_type == "quiz":
        if quiz_percentage is None:
            return {
                "success": False,
                "error": "Quiz percentage is required for a quiz."
            }

        try:
            quiz_percentage = float(quiz_percentage)
        except (TypeError, ValueError):
            return {
                "success": False,
                "error": "Quiz percentage must be numeric."
            }

        if not 0 <= quiz_percentage <= 100:
            return {
                "success": False,
                "error": "Quiz percentage must be between 0 and 100."
            }

    if task_type == "assignment":
        if assignment_percentage is None:
            return {
                "success": False,
                "error": "Assignment percentage is required."
            }

        try:
            assignment_percentage = float(assignment_percentage)
        except (TypeError, ValueError):
            return {
                "success": False,
                "error": "Assignment percentage must be numeric."
            }

        if not 0 <= assignment_percentage <= 100:
            return {
                "success": False,
                "error": "Assignment percentage must be between 0 and 100."
            }

    try:
    
        existing_sessions = students_collection.find(
            {"student_id": student_id},
            {"session_id": 1, "_id": 0}
        )

        prefix = f"{student_id}_S"
        highest_number = 0

        for record in existing_sessions:
            session_id = str(record.get("session_id", ""))

            match = re.fullmatch(
                re.escape(prefix) + r"(\d+)",
                session_id
            )

            if match:
                highest_number = max(
                    highest_number,
                    int(match.group(1))
                )

        new_session_id = f"{prefix}{highest_number + 1}"

        quiz_score = (
            quiz_percentage if task_type == "quiz" else None
        )

        assignment_score = (
            assignment_percentage
            if task_type == "assignment"
            else None
        )

        new_session = {
            "student_id": student_id,
            "session_id": new_session_id,
            "timestamp": datetime.now(timezone.utc),
            "module_id": str(module_id),

            "task_id": task_id,
            "task_name": task_name or task_id,
            "task_type": task_type,
            "task_status": "completed",

            "time_spent_minutes": 0.0,
            "pages_visited": 0,
            "video_watched_percent": 0.0,
            "click_events": 0,
            "notes_taken": 0,
            "forum_posts": 0,
            "revisit_flag": 0,

            "quiz_score": quiz_score,
            "assignment_score": assignment_score,
            "attempts_taken": (
                int(attempts_taken) if task_type == "quiz" else 0
            ),

            "feedback_rating": None,
            "days_since_last_activity": None,
            "cumulative_quiz_score": quiz_score,
            "learning_trend": None,
            "attention_score": None,
            "feedback_type": None,
            "next_module_prediction": None,
            "success_label": None
        }

        students_collection.insert_one(new_session)

        return {
            "success": True,
            "message": "New session created successfully.",
            "session_id": new_session_id,
            "quiz_score": quiz_score,
            "assignment_score": assignment_score
        }

    except PyMongoError as error:
        print("MongoDB session error:", repr(error))

        return {
            "success": False,
            "error": "Unable to save the session."
        }

def save_assessment_session( student_id, module_id, task_id, task_type, percentage, attempts_taken=1 ):
     if task_type not in ("quiz", "assignment"): return { "success": False, "error": "Invalid assessment type." } 
     kwargs = { "student_id": student_id, "module_id": module_id, "task_id": task_id, "task_name": task_id, "task_type": task_type, "attempts_taken": attempts_taken } 
     if task_type == "quiz": kwargs["quiz_percentage"] = percentage 
     else: kwargs["assignment_percentage"] = percentage 
     return create_new_session(**kwargs)

def get_student_sessions(student_id, limit=None):

    query = students_collection.find(
        {"student_id": student_id},
        {"_id": 0}
    ).sort("timestamp", DESCENDING)

    if limit is not None:
        query = query.limit(int(limit))

    sessions = list(query)
    sessions.reverse()

    return sessions