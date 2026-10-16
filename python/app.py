from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from Example.graph import create_graph
from Example.new import get_data
from OptimalPath.Data import get_student_data
from OptimalPath.category import calculate_student_clusters
from pymongo import MongoClient
from bson import ObjectId

from dotenv import load_dotenv
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from OptimalPath.Task import get_task_questions
from OptimalPath.Task import check_quiz_answers
from OptimalPath.Session import create_new_session, get_student_sessions, save_assessment_session


load_dotenv()

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET = os.getenv("JWT_SECRET")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not configured")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not configured")

client = MongoClient(MONGO_URI)

db = client["research_db"]
collection = db["users"]

@app.route("/", methods=["GET"])
def home():
    return "Flask server is running"


@app.route("/api/auth/login", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "message": "Email and password are required"
        }), 400

    user = collection.find_one({
        "email": email
    })

    if not user:
        return jsonify({
            "message": "Invalid email or password"
        }), 401

    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):
        return jsonify({
            "message": "Invalid email or password"
        }), 401

    token = jwt.encode(
        {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "exp": datetime.utcnow() + timedelta(hours=24)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    return jsonify({
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role")
        }
    }), 200

@app.route("/api/auth/me", methods=["GET"])
def get_current_user():

    token = request.headers.get("x-auth-token")

    if not token:
        return jsonify({
            "message": "No token provided"
        }), 401

    try:
        decoded = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"]
        )

        user = collection.find_one({
            "_id": ObjectId(decoded["user_id"])
        })

        if not user:
            return jsonify({
                "message": "User not found"
            }), 404

        return jsonify({
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role")
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({
            "message": "Token expired"
        }), 401

    except jwt.InvalidTokenError:
        return jsonify({
            "message": "Invalid token"
        }), 401

@app.route("/api/auth/register", methods=["POST", "OPTIONS"])
def register():

    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({
            "message": "Name, email and password are required"
        }), 400

    existing_user = collection.find_one({
        "email": email
    })

    if existing_user:
        return jsonify({
            "message": "User already exists"
        }), 400

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    user = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "role": "Student",
        "createdAt": datetime.utcnow()
    }

    result = collection.insert_one(user)

    token = jwt.encode(
        {
            "user_id": str(result.inserted_id),
            "email": email,
            "exp": datetime.utcnow() + timedelta(hours=24)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "name": name,
            "email": email,
            "role": "Student"
        }
    }), 201



@app.route("/graph", methods=["POST"])
def graph():
    data = request.get_json()

    student_id = data.get("studentId")

    image = create_graph(student_id)

    return send_file(
        image,
        mimetype="image/png"
    )

@app.route("/Example/new", methods=["GET"])
def example_data():
    try:
        data = get_data()

        return jsonify(data), 200

    except Exception as e:
        print("Error fetching example data:", e)
        return jsonify({
            "error": "Failed to fetch data",
            "message": str(e)
        }), 500

@app.route("/StudentData", methods=["GET"])
def student_data():

    try:

        result = get_student_data()

        print("\n FLASK STUDENT DATA ")
        print("TYPE:", type(result))
        print("RECORD COUNT:", len(result))

        if len(result) > 0:
            print("FIRST RECORD:")
            print(result[0])


        return jsonify(result)

    except Exception as e:

        print("ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500

@app.route("/StudentClusters", methods=["GET"])
def student_clusters():

    try:

        result = calculate_student_clusters()

        print("\n STUDENT CLUSTERS ")
        print("RECORD COUNT:", len(result))

        if len(result) > 0:
            print("FIRST RECORD:")
            print(result[0])


        return jsonify(result)

    except Exception as e:

        print("CLUSTER ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500

@app.route("/task/<task_id>", methods=["GET"])
def quiz_questions(task_id):
    print("\n TASK REQUEST ")
    print("Task ID received:", task_id)

    questions = get_task_questions(task_id)

    if questions is None:
        return jsonify({
            "error": "Failed to retrieve questions"
        }), 500

    print("Questions returned:", questions)

    return jsonify(questions), 200

@app.route("/submit-quiz", methods=["POST"])
def submit_quiz():
    try:
        data = request.get_json()

        result = check_quiz_answers(
            student_id=data.get("student_id", "S0001"),
            session_id=data.get("session_id", "S1"),
            module_id=data.get("module_id", "3"),
            task_id=data.get("task_id"),
            student_answers=data.get("answers", {})
        )

        status_code = 200 if result.get("success") else 400
        return jsonify(result), status_code

    except Exception as e:
        print("Error submitting quiz:", repr(e))
        return jsonify({
            "success": False,
            "error": "Unable to check quiz answers"
        }), 500

@app.route("/create-session", methods=["POST"]) 
def create_session():
    print( "\nDEBUG: NEW CREATE-SESSION ROUTE IS RUNNING", flush=True ) 
    data = request.get_json(silent=True) or {} 
    print("\n========== CREATE SESSION REQUEST ==========", flush=True) 
    print("Received data:", data, flush=True) 
    print("Student ID:", repr(data.get("student_id")), flush=True) 
    print("Module ID:", repr(data.get("module_id")), flush=True) 
    print("Task ID:", repr(data.get("task_id")), flush=True) 
    print("Task type:", repr(data.get("task_type")), flush=True) 
    print("Quiz percentage:", repr(data.get("quiz_percentage")), flush=True) 
    print("Assignment percentage:", repr(data.get("assignment_percentage")), flush=True)
    result = create_new_session( student_id=data.get("student_id"), module_id=data.get("module_id"), 
                                    task_id=data.get("task_id"), task_name=data.get("task_name"), 
                                    task_type=data.get("task_type"), 
                                    quiz_percentage=data.get("quiz_percentage"), 
                                    assignment_percentage=data.get("assignment_percentage"), 
                                    attempts_taken=data.get("attempts_taken", 0) ) 
    print("SESSION CREATION RESULT:", result, flush=True) 
    print("============================================\n", flush=True) 
    if not result.get("success"): 
        return jsonify(result), 400 
    return jsonify(result), 201

@app.route("/student-sessions/<student_id>", methods=["GET"])
def student_sessions(student_id):
    try:
        sessions = get_student_sessions(student_id)
        return jsonify({
            "success": True,
            "count": len(sessions),
            "sessions": sessions
        })
    except Exception as error:
        print("Retrieve sessions error:", repr(error))
        return jsonify({
            "success": False,
            "error": "Unable to retrieve student sessions."
        }), 500

@app.route("/save-assessment", methods=["POST"]) 
def save_assessment():
    data = request.get_json(silent=True) or {} 
    result = save_assessment_session( 
        student_id=data.get("student_id"), 
        module_id=data.get("module_id"), 
        task_id=data.get("task_id"), 
        task_type=data.get("task_type"), 
        percentage=data.get("percentage"), 
        attempts_taken=data.get("attempts_taken", 1) 
    ) 
    return jsonify(result), (
         201 if result.get("success") else 400 )

if __name__ == "__main__":
    app.run(port=3000, debug=False)