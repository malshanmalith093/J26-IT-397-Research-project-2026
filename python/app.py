from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from Example.graph import create_graph
from Example.new import get_data

from pymongo import MongoClient
from bson import ObjectId

from dotenv import load_dotenv
import bcrypt
import jwt
import os
from datetime import datetime, timedelta

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



if __name__ == "__main__":
    app.run(port=3000, debug=False)