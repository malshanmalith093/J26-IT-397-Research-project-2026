from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)

db = client["research_db"]

questions_collection = db["tasks"]
#quiz_attempts_collection = db["quiz_attempts"]
students_collection = db["students"]


def get_task_questions(task_id):
    try:
        documents = list(
            questions_collection.find({"task_id": task_id})
        )

        questions = []

        for doc in documents:
            print("MongoDB document:", doc)

            question_text = doc.get("Question") or doc.get("question") or ""

            questions.append({
                "question_id": doc.get("QId") or doc.get("question_id"),
                "question": question_text,
                "options": doc.get("Options") or doc.get("options") or [],
                "type": str(doc.get("Type") or doc.get("type") or "text").lower(),
                "marks": doc.get("Marks") or doc.get("marks") or 1
            })

        print("Formatted API response:", questions)
        return questions

    except Exception as e:
        print("Error retrieving task questions:", repr(e))
        return None




def check_quiz_answers(student_id, session_id, module_id, task_id, student_answers):
    try:
        questions = list(questions_collection.find({"task_id": task_id}))

        if not questions:
            return {
                "success": False,
                "error": "No questions found for this task"
            }

        obtained_marks = 0
        total_marks = 0
        answer_results = []

        for question in questions:
            question_id = question.get("QId") or question.get("question_id")
            correct_answer = (
                question.get("CorrectAnswer")
                or question.get("correct_answer")
                or ""
            )
            marks = question.get("Marks", question.get("marks", 1))

            # Normalize answers to ignore leading/trailing spaces and case
            student_answer = str(
                student_answers.get(question_id, "")
            ).strip()
            correct_answer = str(correct_answer).strip()

            is_correct = (
                student_answer.casefold() == correct_answer.casefold()
            )

            total_marks += marks

            awarded_marks = marks if is_correct else 0
            obtained_marks += awarded_marks

            answer_results.append({
                "question_id": question_id,
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "marks_awarded": awarded_marks,
                "total_question_marks": marks
            })

        percentage = round(
            (obtained_marks / total_marks) * 100, 2
        ) if total_marks > 0 else 0

        return {
            "success": True,
            "student_id": student_id,
            "session_id": session_id,
            "module_id": module_id,
            "task_id": task_id,
            "obtained_marks": obtained_marks,
            "total_marks": total_marks,
            "percentage": percentage,
            "answers": answer_results
        }

    except Exception as e:
        print("Error checking quiz answers:", repr(e))
        return {
            "success": False,
            "error": str(e)
        }