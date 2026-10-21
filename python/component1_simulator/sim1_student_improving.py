"""
Component 1 simulator 1 - student who IMPROVES (Introduction to Python Programming).

Story: the student starts at High risk (missing classes, little study time).
After the first advice they attend more and study more, so Component 1's
risk prediction falls High -> Medium -> Low over three assessments.

Run from the python/ folder (Flask must be running):
    python component1_simulator/sim1_student_improving.py
    python component1_simulator/sim1_student_improving.py --email student@my.sliit.lk --delay 0
"""

from c1_common import run

OUTPUTS = [
    {"label": "Assessment 1 - starting point, high risk",
     "output": {"previous_gpa": 2.45, "attendance": 58, "assignment_score": 46, "quiz_score": 41,
                "study_hours": 4, "engagement_score": 35, "late_assignments": 2, "completed_assignments": 2,
                "learning_progress": 30, "academic_risk_level": "High",
                "risk_score": 0.81, "risk_trend": "increasing", "confidence": 0.78}},
    {"label": "Assessment 2 - after the first advice: attending and studying more",
     "output": {"previous_gpa": 2.45, "attendance": 74, "assignment_score": 58, "quiz_score": 55,
                "study_hours": 8, "engagement_score": 56, "late_assignments": 1, "completed_assignments": 4,
                "learning_progress": 50, "academic_risk_level": "Medium",
                "risk_score": 0.55, "risk_trend": "decreasing", "confidence": 0.74}},
    {"label": "Assessment 3 - back on track",
     "output": {"previous_gpa": 2.45, "attendance": 88, "assignment_score": 71, "quiz_score": 69,
                "study_hours": 12, "engagement_score": 72, "late_assignments": 0, "completed_assignments": 6,
                "learning_progress": 70, "academic_risk_level": "Low",
                "risk_score": 0.27, "risk_trend": "decreasing", "confidence": 0.8}},
]

if __name__ == "__main__":
    run("Student improving (High -> Medium -> Low)", __doc__, "IT1010", OUTPUTS, prefer_index=0)
