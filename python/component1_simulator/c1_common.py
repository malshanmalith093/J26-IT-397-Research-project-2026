"""
Shared helper for the Component 1 simulator scripts (standard library only).

Each simulator pretends to be the Component 1 ML model: it sends a series of
risk-model outputs for one student (one per assessment) to Component 2:

    POST {C2_URL}/api/advice/c1/ingest      header X-C1-API-Key: {C1_API_KEY}

Component 2 then compares each output with the previous one, generates the
personalised advice (with the main reason for each recommendation) and
delivers it to that student automatically.

Settings are read from python/.env (or environment variables):
    C2_URL      default http://localhost:3000
    C1_API_KEY  optional - if empty, Component 2 accepts requests from this computer only
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(os.path.dirname(HERE), ".env")


def load_env(path=ENV_FILE):
    """Tiny .env reader so the scripts need no extra packages."""
    values = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def settings():
    env = load_env()
    return {
        "url": (os.getenv("C2_URL") or env.get("C2_URL") or "http://localhost:3000").rstrip("/"),
        "key": os.getenv("C1_API_KEY") or env.get("C1_API_KEY") or "",
    }


def _request(method, url, key, body=None, timeout=240):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if key:
        req.add_header("X-C1-API-Key", key)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as err:
        try:
            return err.code, json.loads(err.read().decode() or "{}")
        except json.JSONDecodeError:
            return err.code, {"message": str(err)}
    except urllib.error.URLError as err:
        sys.exit(f"Cannot reach Component 2 at {url}. Is Flask running (python app.py)?  ({err.reason})")


def choose_student(cfg, email=None, prefer_index=0):
    """Use --email, otherwise list registered students and ask (or pick one automatically)."""
    if email:
        return email
    status, students = _request("GET", f"{cfg['url']}/api/advice/c1/students", cfg["key"])
    if status != 200:
        sys.exit(f"Could not list students ({status}): {students.get('message')}")
    if not students:
        sys.exit("No registered students yet. Register a student account in the app first.")
    print("\nRegistered students:")
    for i, s in enumerate(students, start=1):
        print(f"  {i}. {s['name']} <{s['email']}>")
    default = min(prefer_index, len(students) - 1)
    if sys.stdin.isatty():
        answer = input(f"Choose a student [1-{len(students)}] (Enter = {default + 1}): ").strip()
        if answer.isdigit() and 1 <= int(answer) <= len(students):
            default = int(answer) - 1
    return students[default]["email"]


def parse_args(description, default_course):
    p = argparse.ArgumentParser(description=description)
    p.add_argument("--email", help="email of the registered student who receives the outputs")
    p.add_argument("--course", default=default_course, help=f"course code (default {default_course})")
    p.add_argument("--delay", type=float, default=3.0,
                   help="seconds to wait between assessments (default 3)")
    p.add_argument("--steps", type=int, default=0, help="send only the first N assessments")
    return p.parse_args()


def run(scenario_name, description, course, outputs, prefer_index=0):
    """Send each Component 1 output in order and print what Component 2 delivered."""
    args = parse_args(description, course)
    cfg = settings()
    email = choose_student(cfg, args.email, prefer_index)
    steps = outputs[: args.steps] if args.steps else outputs

    print(f"\n=== Component 1 simulator: {scenario_name} ===")
    print(f"Student: {email} | Course: {args.course} | Component 2: {cfg['url']}")
    print(f"Sending {len(steps)} assessment(s). Each one takes a few seconds while the AI writes the advice.\n")

    for i, step in enumerate(steps, start=1):
        label, record = step["label"], step["output"]
        body = {
            "student_email": email,
            "course_code": args.course,
            "model_version": "risk-model-simulator-1.0",
            "assessed_at": datetime.now(timezone.utc).isoformat(),
            "output": record,
        }
        print(f"[{i}/{len(steps)}] {label}")
        print(f"      C1 output -> risk {record['academic_risk_level']}, attendance {record['attendance']}%, "
              f"quiz {record['quiz_score']}%, study {record['study_hours']} h/week, late {record['late_assignments']}")
        started = time.time()
        status, res = _request("POST", f"{cfg['url']}/api/advice/c1/ingest", cfg["key"], body)
        took = time.time() - started
        if status != 200 or not res.get("ok"):
            errors = res.get("errors") or [res.get("message")]
            print(f"      FAILED ({status}): {'; '.join(str(e) for e in errors)}")
            sys.exit(1)
        print(f"      C2 delivered advice in {took:.1f}s -> status {res['overall_status']}"
              f"{', progress ' + res['progress'] if res.get('progress') else ' (first assessment)'}"
              f" [{res['provider']}]")
        print(f"      Headline: {res['headline']}")
        if res.get("progress_message"):
            print(f"      Progress: {res['progress_message']}")
        if res.get("fallback_reason"):
            print(f"      Note: offline advice used ({res['fallback_reason']})")
        if i < len(steps) and args.delay > 0:
            time.sleep(args.delay)

    print(f"\nDone. Log in as {email} and open Behavioral Profile (or the Dashboard) to see the advice.")
