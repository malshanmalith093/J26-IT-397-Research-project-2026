"""
Component 1 simulator 3 - student who does NOT improve (Database Systems).

Story: the student begins at Medium risk, but attendance, engagement and
study time keep dropping and more work is missed, so Component 1's risk
prediction rises Medium -> High and stays High. The advice should notice the
decline and push for support (lecturer / academic advisor).

Run from the python/ folder (Flask must be running):
    python component1_simulator/sim3_student_not_improving.py
    python component1_simulator/sim3_student_not_improving.py --email student@my.sliit.lk --delay 0
"""

from c1_common import run

OUTPUTS = [
    {"label": "Assessment 1 - average, some warning signs",
     "output": {"previous_gpa": 2.85, "attendance": 78, "assignment_score": 63, "quiz_score": 58,
                "study_hours": 7, "engagement_score": 54, "late_assignments": 1, "completed_assignments": 4,
                "learning_progress": 55, "academic_risk_level": "Medium",
                "risk_score": 0.49, "risk_trend": "stable", "confidence": 0.72}},
    {"label": "Assessment 2 - missing classes, studying less",
     "output": {"previous_gpa": 2.85, "attendance": 66, "assignment_score": 54, "quiz_score": 47,
                "study_hours": 5, "engagement_score": 41, "late_assignments": 2, "completed_assignments": 4,
                "learning_progress": 57, "academic_risk_level": "High",
                "risk_score": 0.68, "risk_trend": "increasing", "confidence": 0.75}},
    {"label": "Assessment 3 - still declining",
     "output": {"previous_gpa": 2.85, "attendance": 57, "assignment_score": 46, "quiz_score": 39,
                "study_hours": 3, "engagement_score": 29, "late_assignments": 3, "completed_assignments": 4,
                "learning_progress": 58, "academic_risk_level": "High",
                "risk_score": 0.83, "risk_trend": "increasing", "confidence": 0.8}},
]

if __name__ == "__main__":
    run("Student NOT improving (Medium -> High)", __doc__, "IT2040", OUTPUTS, prefer_index=2)
