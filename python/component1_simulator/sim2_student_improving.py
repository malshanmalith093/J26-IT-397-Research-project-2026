"""
Component 1 simulator 2 - student who IMPROVES (Web Development Basics).

Story: good attendance but poor time management - assignments are late and
quiz marks are average. After the advice the student starts work earlier and
practises more, so late submissions drop and the risk falls Medium -> Low.

Run from the python/ folder (Flask must be running):
    python component1_simulator/sim2_student_improving.py
    python component1_simulator/sim2_student_improving.py --email student@my.sliit.lk --delay 0
"""

from c1_common import run

OUTPUTS = [
    {"label": "Assessment 1 - late submissions, average quizzes",
     "output": {"previous_gpa": 3.05, "attendance": 90, "assignment_score": 62, "quiz_score": 57,
                "study_hours": 8, "engagement_score": 55, "late_assignments": 3, "completed_assignments": 4,
                "learning_progress": 55, "academic_risk_level": "Medium",
                "risk_score": 0.52, "risk_trend": "increasing", "confidence": 0.71}},
    {"label": "Assessment 2 - starting work earlier, fewer late tasks",
     "output": {"previous_gpa": 3.05, "attendance": 92, "assignment_score": 68, "quiz_score": 64,
                "study_hours": 9, "engagement_score": 61, "late_assignments": 1, "completed_assignments": 5,
                "learning_progress": 61, "academic_risk_level": "Medium",
                "risk_score": 0.41, "risk_trend": "decreasing", "confidence": 0.73}},
    {"label": "Assessment 3 - on time and confident",
     "output": {"previous_gpa": 3.05, "attendance": 94, "assignment_score": 77, "quiz_score": 74,
                "study_hours": 11, "engagement_score": 70, "late_assignments": 0, "completed_assignments": 6,
                "learning_progress": 71, "academic_risk_level": "Low",
                "risk_score": 0.22, "risk_trend": "decreasing", "confidence": 0.79}},
]

if __name__ == "__main__":
    run("Student improving (time management)", __doc__, "IT1050", OUTPUTS, prefer_index=1)
