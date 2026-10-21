"""
Dummy data for PP1.

DUMMY_STUDENTS imitate what the Component 1 risk model will output.
Replace them with real Component 1 results once that model is available.

Course context now comes from the Courses page (MongoDB c2_courses, seeded
from course_seed.py). COURSES below is the same information built from the
sample courses, used by tests and as an offline fallback.
"""

from .course_seed import DEFAULT_COURSE_CODE, SEED_COURSES


def _context(course):
    return {
        "code": course["code"], "name": course["name"],
        "current_week": course["current_week"], "total_weeks": course["total_weeks"],
        "assignments_released": course["assignments_released"],
        "expected_progress": course["expected_progress"], "upcoming": course["upcoming"],
        "topics": [{"week": l["week"], "title": l["title"], "summary": l.get("summary", "")}
                   for l in course["lessons"]],
    }


COURSES = {c["code"]: _context(c) for c in SEED_COURSES}
DEFAULT_COURSE = DEFAULT_COURSE_CODE

# Each entry: Component 1 output (+ optional Appendix 4 extras) and a scenario label
DUMMY_STUDENTS = [
    {
        "scenario": "High risk - disengaged across the board",
        "course_code": "IT2040",
        "record": {
            "student_id": "STU-1001", "previous_gpa": 2.10, "attendance": 58,
            "assignment_score": 42, "quiz_score": 38, "study_hours": 4,
            "engagement_score": 30, "late_assignments": 4, "completed_assignments": 2,
            "learning_progress": 35, "academic_risk_level": "High",
            "risk_score": 0.86, "risk_trend": "increasing", "confidence": 0.81,
        },
    },
    {
        "scenario": "High risk - works hard but struggles with concepts",
        "course_code": "IT1010",
        "record": {
            "student_id": "STU-1002", "previous_gpa": 2.65, "attendance": 88,
            "assignment_score": 55, "quiz_score": 35, "study_hours": 14,
            "engagement_score": 74, "late_assignments": 1, "completed_assignments": 5,
            "learning_progress": 52, "academic_risk_level": "High",
            "risk_score": 0.71, "risk_trend": "stable", "confidence": 0.69,
        },
    },
    {
        "scenario": "Medium risk - missing classes, average marks",
        "course_code": "IT2040",
        "record": {
            "student_id": "STU-1003", "previous_gpa": 2.90, "attendance": 70,
            "assignment_score": 66, "quiz_score": 60, "study_hours": 8,
            "engagement_score": 55, "late_assignments": 2, "completed_assignments": 4,
            "learning_progress": 56, "academic_risk_level": "Medium",
            "risk_score": 0.52, "risk_trend": "stable", "confidence": 0.72,
        },
    },
    {
        "scenario": "Medium risk - good marks, poor time management",
        "course_code": "IT1050",
        "record": {
            "student_id": "STU-1004", "previous_gpa": 3.20, "attendance": 91,
            "assignment_score": 74, "quiz_score": 71, "study_hours": 9,
            "engagement_score": 58, "late_assignments": 4, "completed_assignments": 3,
            "learning_progress": 64, "academic_risk_level": "Medium",
            "risk_score": 0.47, "risk_trend": "increasing", "confidence": 0.66,
        },
    },
    {
        "scenario": "Medium risk - low study time and engagement",
        "course_code": "IT1010",
        "record": {
            "student_id": "STU-1005", "previous_gpa": 3.00, "attendance": 81,
            "assignment_score": 62, "quiz_score": 57, "study_hours": 5,
            "engagement_score": 34, "late_assignments": 1, "completed_assignments": 5,
            "learning_progress": 48, "academic_risk_level": "Medium",
            "risk_score": 0.55, "risk_trend": "increasing", "confidence": 0.74,
        },
    },
    {
        "scenario": "Low risk - but quiz marks slipping",
        "course_code": "IT2040",
        "record": {
            "student_id": "STU-1006", "previous_gpa": 3.40, "attendance": 89,
            "assignment_score": 79, "quiz_score": 63, "study_hours": 11,
            "engagement_score": 66, "late_assignments": 0, "completed_assignments": 6,
            "learning_progress": 68, "academic_risk_level": "Low",
            "risk_score": 0.28, "risk_trend": "increasing", "confidence": 0.70,
        },
    },
    {
        "scenario": "Low risk - excellent, ready for stretch goals",
        "course_code": "IT1050",
        "record": {
            "student_id": "STU-1007", "previous_gpa": 3.85, "attendance": 96,
            "assignment_score": 88, "quiz_score": 91, "study_hours": 18,
            "engagement_score": 87, "late_assignments": 0, "completed_assignments": 6,
            "learning_progress": 84, "academic_risk_level": "Low",
            "risk_score": 0.08, "risk_trend": "decreasing", "confidence": 0.88,
        },
    },
    {
        "scenario": "High risk - many missing assignments",
        "course_code": "IT2040",
        "record": {
            "student_id": "STU-1008", "previous_gpa": 2.55, "attendance": 76,
            "assignment_score": 48, "quiz_score": 54, "study_hours": 7,
            "engagement_score": 45, "late_assignments": 3, "completed_assignments": 3,
            "learning_progress": 41, "academic_risk_level": "High",
            "risk_score": 0.77, "risk_trend": "increasing", "confidence": 0.75,
        },
    },
]

# Example of the Appendix 4 payload shape (also accepted by the API)
APPENDIX4_EXAMPLE = {
    "schema_version": "1.0",
    "event_id": "6b1f8f3e-1a2b-4c3d-9e8f-001122334455",
    "student_id": "STU-2001",
    "assessment_version": "v1",
    "model_version": "risk-model-v1",
    "risk_assessment": {
        "risk_level": "medium",
        "risk_score": 0.64,
        "predicted_performance": 68.5,
        "confidence": 0.76,
    },
    "key_indicators": {
        "assessment_performance": 0.61,
        "attendance": 0.82,
        "engagement": 0.71,
        "learning_consistency": 0.67,
    },
    "risk_trend": "increasing",
    "timestamp": "2026-10-20T09:30:00+05:30",
}
