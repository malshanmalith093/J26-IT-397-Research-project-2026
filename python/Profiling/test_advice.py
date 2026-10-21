"""
Unit tests for the Component 2 advice engine (no internet / API key needed).

Needs: pip install mongomock   (test-only, in-memory MongoDB)
Run from the python/ folder:
    python -m unittest Profiling.test_advice -v
"""

import json
import os

import jwt
import unittest
from types import SimpleNamespace
from unittest import mock

from flask import Flask

os.environ.setdefault("JWT_SECRET", "test-secret")

from Profiling import advisor, llm_client
from Profiling.contract import normalise_record
from Profiling.dummy_data import APPENDIX4_EXAMPLE, COURSES, DUMMY_STUDENTS
from Profiling.routes import advice_bp
from Profiling.signals import detect_signals, fallback_advice


def make_app():
    """Flask app with an in-memory MongoDB (mongomock) and three users."""
    import mongomock
    from Profiling.routes import init_advice
    db = mongomock.MongoClient()["research_db"]
    ids = {}
    for name, email, role in [("Admin", "admin@sliit.lk", "Admin"),
                              ("Nimal", "nimal@my.sliit.lk", "Student"),
                              ("Kamala", "kamala@my.sliit.lk", "Student")]:
        ids[name] = str(db["users"].insert_one({"name": name, "email": email, "role": role,
                                               "password": "x"}).inserted_id)
    init_advice(db)
    app = Flask(__name__)
    app.register_blueprint(advice_bp)
    return app.test_client(), db, ids


def node_token(user_id, role):
    """Token in the Node/Express format."""
    return jwt.encode({"user": {"id": user_id, "role": role}}, os.environ["JWT_SECRET"], algorithm="HS256")


def flask_token(user_id, email):
    """Token in the Flask format (no role inside)."""
    return jwt.encode({"user_id": user_id, "email": email}, os.environ["JWT_SECRET"], algorithm="HS256")


class ContractTests(unittest.TestCase):
    def test_all_dummy_students_are_valid(self):
        for item in DUMMY_STUDENTS:
            record, errors, _ = normalise_record(item["record"])
            self.assertEqual(errors, [], item["scenario"])
            self.assertIn(record["academic_risk_level"], ("Low", "Medium", "High"))

    def test_risk_level_variants(self):
        for raw, expected in [("high", "High"), ("Moderate", "Medium"), ("0", "Low"), (2, "High")]:
            record, errors, _ = normalise_record({"student_id": "X", "academic_risk_level": raw})
            self.assertEqual(errors, [])
            self.assertEqual(record["academic_risk_level"], expected)

    def test_missing_required_and_out_of_range(self):
        _, errors, _ = normalise_record({"attendance": 140})
        self.assertTrue(any("student_id" in e for e in errors))
        self.assertTrue(any("academic_risk_level" in e for e in errors))
        self.assertTrue(any("attendance" in e for e in errors))

    def test_appendix4_payload_is_mapped(self):
        record, errors, _ = normalise_record(APPENDIX4_EXAMPLE)
        self.assertEqual(errors, [])
        self.assertEqual(record["academic_risk_level"], "Medium")
        self.assertEqual(record["attendance"], 82.0)
        self.assertEqual(record["_source_shape"], "appendix4")

    def test_previous_gpa_is_not_sent_to_advice_engine(self):
        from Profiling.contract import advice_input
        record, _, _ = normalise_record(DUMMY_STUDENTS[0]["record"])
        self.assertNotIn("previous_gpa", advice_input(record))


class SignalAndFallbackTests(unittest.TestCase):
    def test_high_risk_student_gets_reasons_for_every_recommendation(self):
        item = DUMMY_STUDENTS[0]
        record, _, _ = normalise_record(item["record"])
        course = COURSES[item["course_code"]]
        signals = detect_signals(record, course)
        advice = fallback_advice(record, course, signals)
        self.assertEqual(advice["status_summary"]["overall_status"], "at_risk")
        self.assertGreaterEqual(len(advice["recommendations"]), 3)
        for rec in advice["recommendations"]:
            self.assertTrue(rec["main_reason"].strip())
            self.assertTrue(rec["evidence_fields"])
        self.assertTrue(any(r["category"] == "support" for r in advice["recommendations"]))

    def test_effort_without_results_pattern(self):
        item = DUMMY_STUDENTS[1]
        record, _, _ = normalise_record(item["record"])
        signals = detect_signals(record, COURSES[item["course_code"]])
        self.assertTrue(any(s.get("pattern") == "effort_without_results" for s in signals))

    def test_low_risk_student_is_on_track(self):
        item = DUMMY_STUDENTS[6]
        record, _, _ = normalise_record(item["record"])
        course = COURSES[item["course_code"]]
        advice = fallback_advice(record, course, detect_signals(record, course))
        self.assertEqual(advice["status_summary"]["overall_status"], "on_track")

    def test_student_text_never_shows_technical_field_names(self):
        """LLM replies sometimes leak 'completed_assignments = 2' or '58.0→58.0' style
        notation; humanise_advice must turn it into plain language (FR: student-facing
        advice is readable). evidence_fields keep the technical names on purpose."""
        advice = {
            "status_summary": {"overall_status": "at_risk",
                               "headline": "High risk because risk_trend = increasing",
                               "explanation": "Attendance went 58.0→58.0 and completed_assignments = 2."},
            "strengths": [{"area": "coursework", "evidence": "You did some work (completed_assignments = 2)."}],
            "concerns": [{"area": "trend", "evidence": "risk_trend is worsening.", "severity": "high"}],
            "recommendations": [{"title": "Submit on time", "category": "assignments", "priority": "high",
                                 "action": "Track study_hours weekly.", "main_reason": "late_assignments = 4",
                                 "evidence_fields": ["late_assignments"], "expected_impact": "", "timeframe": ""}],
            "improvement_guide": {
                "weekly_plan": [{"week": 1, "focus": "Improve quiz_score", "tasks": ["Raise engagement_score"]}],
                "course_focus_topics": [{"topic": "SQL Joins", "week": 3, "why": "learning_progress = 35", "how": "Redo lab 3"}]},
            "other_advice": ["Watch your risk_score each week."],
            "motivation_message": "Keep going.",
            "progress_message": "attendance 58.0->74.0",
        }
        out = advisor.humanise_advice(advice)
        # the technical names survive ONLY in evidence_fields
        self.assertEqual(out["recommendations"][0]["evidence_fields"], ["late_assignments"])
        no_fields = json.dumps({**out, "recommendations": [
            {k: v for k, v in r.items() if k != "evidence_fields"} for r in out["recommendations"]]})
        for name in ("risk_trend", "completed_assignments", "study_hours", "late_assignments",
                     "engagement_score", "quiz_score", "learning_progress", "risk_score"):
            self.assertNotIn(name, no_fields)
        self.assertNotIn("→", no_fields)   # no arrows
        self.assertNotIn("->", no_fields)
        self.assertIn("risk trend is increasing", out["status_summary"]["headline"])
        self.assertIn("58.0 to 58.0", out["status_summary"]["explanation"])
        self.assertIn("completed assignments is 2", out["strengths"][0]["evidence"])
        self.assertIn("attendance 58.0 to 74.0", out["progress_message"])


PROVIDER_VARS = ["LLM_PROVIDER", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_BASE_URL", "AZURE_FOUNDRY_ENDPOINT",
                 "AZURE_FOUNDRY_API_KEY", "AZURE_FOUNDRY_MODEL", "AZURE_FOUNDRY_AUTH", "AZURE_OPENAI_ENDPOINT",
                 "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT", "CUSTOM_OPENAI_BASE_URL",
                 "CUSTOM_OPENAI_API_KEY", "CUSTOM_OPENAI_MODEL", "CUSTOM_OPENAI_HEADERS", "LLM_JSON_MODE",
                 "ADVICE_MODE"]


def provider_env(**values):
    """Patch os.environ with ONLY the given provider settings (ignores the developer's own .env/shell)."""
    env = {k: v for k, v in os.environ.items() if k not in PROVIDER_VARS}
    env.update(values)
    return mock.patch.dict(os.environ, env, clear=True)


def fake_response(payload, raw=None, finish_reason="stop"):
    msg = SimpleNamespace(content=raw if raw is not None else json.dumps(payload), refusal=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=msg, finish_reason=finish_reason)],
                           usage=SimpleNamespace(total_tokens=1234), model="fake-model")


class FakeBadRequest(Exception):
    status_code = 400


class ProviderConfigTests(unittest.TestCase):
    def test_foundry_url_normalisation(self):
        f = llm_client.foundry_base_url
        self.assertEqual(f("https://res.services.ai.azure.com"), "https://res.services.ai.azure.com/openai/v1/")
        self.assertEqual(f("https://res.openai.azure.com/"), "https://res.openai.azure.com/openai/v1/")
        self.assertEqual(f("https://res.services.ai.azure.com/api/projects/p1"),
                         "https://res.services.ai.azure.com/openai/v1/")
        self.assertEqual(f("https://res.services.ai.azure.com/models"), "https://res.services.ai.azure.com/openai/v1/")
        self.assertEqual(f("https://res.openai.azure.com/openai/v1/chat/completions"),
                         "https://res.openai.azure.com/openai/v1/")

    def test_auto_detect_and_missing_settings(self):
        with provider_env(AZURE_FOUNDRY_ENDPOINT="https://r.services.ai.azure.com", AZURE_FOUNDRY_API_KEY="k",
                          AZURE_FOUNDRY_MODEL="gpt-4o-mini", OPENAI_API_KEY="sk"):
            cfg = llm_client.provider_config()
            self.assertEqual(cfg["provider"], "azure_foundry")
            self.assertTrue(cfg["configured"])
        with provider_env(CUSTOM_OPENAI_BASE_URL="http://localhost:11434/v1", CUSTOM_OPENAI_MODEL="llama3.1"):
            cfg = llm_client.provider_config()
            self.assertEqual(cfg["provider"], "custom")
            self.assertTrue(cfg["configured"])
            self.assertEqual(cfg["api_key"], "not-needed")
        with provider_env(AZURE_FOUNDRY_ENDPOINT="https://r.services.ai.azure.com"):
            cfg = llm_client.provider_config()
            self.assertFalse(cfg["configured"])
            self.assertIn("AZURE_FOUNDRY_MODEL", cfg["reason"])
        with provider_env():
            self.assertFalse(llm_client.provider_config()["configured"])
        with provider_env(LLM_PROVIDER="openai", OPENAI_API_KEY="sk", CUSTOM_OPENAI_BASE_URL="http://x/v1"):
            self.assertEqual(llm_client.provider_config()["provider"], "openai")

    def test_public_info_has_no_secrets(self):
        with provider_env(AZURE_FOUNDRY_ENDPOINT="https://r.services.ai.azure.com", AZURE_FOUNDRY_API_KEY="SECRET",
                          AZURE_FOUNDRY_MODEL="m"):
            info = llm_client.public_info()
        self.assertNotIn("SECRET", json.dumps(info))
        self.assertEqual(info["label"], "Azure AI Foundry")

    def test_extract_json_variants(self):
        e = llm_client.extract_json
        self.assertEqual(e('{"a": 1}'), {"a": 1})
        self.assertEqual(e('<think>reasoning {x}</think>\n```json\n{"a": 2}\n```'), {"a": 2})
        self.assertEqual(e('Here you go: {"a": 3} hope it helps'), {"a": 3})


class LLMPathTests(unittest.TestCase):
    def setUp(self):
        advisor._cache.clear()
        llm_client.reset_state()

    def _record(self, i=2):
        item = DUMMY_STUDENTS[i]
        record, _, _ = normalise_record(item["record"])
        return record, COURSES[item["course_code"]]

    def test_llm_output_is_validated_and_cached(self):
        record, course = self._record()
        model_answer = fallback_advice(record, course, detect_signals(record, course))
        model_answer["recommendations"][0]["evidence_fields"] = ["attendance", "made_up_field"]
        model_answer["recommendations"].append({**model_answer["recommendations"][0], "main_reason": ""})
        fake = mock.MagicMock()
        fake.chat.completions.create.return_value = fake_response(model_answer)
        with provider_env(OPENAI_API_KEY="test-key"), mock.patch.object(llm_client, "get_client", return_value=fake):
            advice, meta, _ = advisor.generate_advice(record, course)
            _, meta2, _ = advisor.generate_advice(record, course)

        self.assertEqual(meta["provider"], "openai")
        self.assertEqual(meta["json_mode"], "json_schema")
        self.assertEqual(meta["tokens"], 1234)
        self.assertNotIn("made_up_field", advice["recommendations"][0]["evidence_fields"])
        self.assertTrue(all(r["main_reason"] for r in advice["recommendations"]))
        kwargs = fake.chat.completions.create.call_args.kwargs
        self.assertEqual(kwargs["response_format"]["type"], "json_schema")
        self.assertNotIn("previous_gpa", kwargs["messages"][1]["content"])
        self.assertTrue(meta2["cached"])
        self.assertEqual(fake.chat.completions.create.call_count, 1)

    def test_foundry_model_without_json_schema_support(self):
        """e.g. a Foundry DeepSeek/Llama deployment: json_schema rejected, json_object rejected, prompt works."""
        record, course = self._record(0)
        answer = fallback_advice(record, course, detect_signals(record, course))
        answer["recommendations"][0]["priority"] = "High"          # wrong case
        answer["recommendations"][0]["category"] = "Time Management"  # label instead of enum
        raw = "<think>let me think</think>\n```json\n" + json.dumps(answer) + "\n```"
        calls = []

        def create(**kw):
            calls.append(kw)
            if "response_format" in kw:
                raise FakeBadRequest("response_format is not supported for this model")
            return fake_response(None, raw=raw)

        fake = mock.MagicMock()
        fake.chat.completions.create.side_effect = create
        env = dict(AZURE_FOUNDRY_ENDPOINT="https://r.services.ai.azure.com", AZURE_FOUNDRY_API_KEY="k",
                   AZURE_FOUNDRY_MODEL="DeepSeek-V3")
        with provider_env(**env), mock.patch.object(llm_client, "get_client", return_value=fake):
            advice, meta, _ = advisor.generate_advice(record, course)
            self.assertEqual(meta["provider"], "azure_foundry")
            self.assertEqual(meta["json_mode"], "prompt")
            self.assertEqual(advice["recommendations"][0]["priority"], "high")
            self.assertEqual(advice["recommendations"][0]["category"], "time_management")
            self.assertIn("JSON schema", calls[-1]["messages"][0]["content"])
            # the working mode is remembered: next student goes straight to "prompt"
            n = len(calls)
            advisor.generate_advice(*self._record(1))
            self.assertEqual(len(calls), n + 1)

    def test_truncated_reply_retries_with_bigger_budget(self):
        """gpt-5-family models spend reasoning tokens from the same output budget, so the JSON
        can be cut off at the cap (finish_reason='length'). chat_json must retry the SAME
        JSON mode with a doubled budget instead of cascading modes / falling back."""
        record, course = self._record(4)
        answer = fallback_advice(record, course, detect_signals(record, course))
        full = json.dumps(answer)
        calls = []

        def create(**kw):
            calls.append(kw)
            if len(calls) == 1:  # cut off half-way through the JSON
                return fake_response(None, raw=full[: len(full) // 2], finish_reason="length")
            return fake_response(answer)

        fake = mock.MagicMock()
        fake.chat.completions.create.side_effect = create
        with provider_env(OPENAI_API_KEY="k"), mock.patch.object(llm_client, "get_client", return_value=fake):
            advice, meta, _ = advisor.generate_advice(record, course)

        self.assertEqual(meta["provider"], "openai")          # no fallback
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1]["max_completion_tokens"], calls[0]["max_completion_tokens"] * 2)
        self.assertEqual(calls[0]["response_format"], calls[1]["response_format"])  # same JSON mode
        self.assertTrue(advice["recommendations"])

    def test_custom_endpoint_needing_max_tokens(self):
        record, course = self._record(3)
        answer = fallback_advice(record, course, detect_signals(record, course))

        def create(**kw):
            if "max_completion_tokens" in kw:
                raise FakeBadRequest("Unrecognized request argument supplied: max_completion_tokens")
            return fake_response(answer)

        fake = mock.MagicMock()
        fake.chat.completions.create.side_effect = create
        with provider_env(CUSTOM_OPENAI_BASE_URL="http://localhost:1234/v1", CUSTOM_OPENAI_MODEL="local"), \
                mock.patch.object(llm_client, "get_client", return_value=fake):
            advice, meta, _ = advisor.generate_advice(record, course)
        self.assertEqual(meta["provider"], "custom")
        self.assertEqual(meta["json_mode"], "json_schema")
        self.assertIn("max_tokens", fake.chat.completions.create.call_args.kwargs)

    def test_auth_error_falls_back_without_retrying_other_modes(self):
        record, course = self._record(0)

        class FakeAuthError(Exception):
            status_code = 401

        fake = mock.MagicMock()
        fake.chat.completions.create.side_effect = FakeAuthError("invalid api key")
        with provider_env(OPENAI_API_KEY="bad"), mock.patch.object(llm_client, "get_client", return_value=fake):
            advice, meta, _ = advisor.generate_advice(record, course)
        self.assertEqual(meta["provider"], "rule_based_fallback")
        self.assertIn("invalid api key", meta["fallback_reason"])
        self.assertEqual(fake.chat.completions.create.call_count, 1)
        self.assertTrue(advice["recommendations"])

    def test_real_clients_are_built_for_each_provider(self):
        cases = [
            dict(OPENAI_API_KEY="sk"),
            dict(AZURE_FOUNDRY_ENDPOINT="https://r.services.ai.azure.com", AZURE_FOUNDRY_API_KEY="k", AZURE_FOUNDRY_MODEL="m"),
            dict(AZURE_OPENAI_ENDPOINT="https://r.openai.azure.com", AZURE_OPENAI_API_KEY="k", AZURE_OPENAI_DEPLOYMENT="d"),
            dict(CUSTOM_OPENAI_BASE_URL="http://localhost:11434/v1", CUSTOM_OPENAI_MODEL="llama3.1",
                 CUSTOM_OPENAI_HEADERS='{"X-Title": "EduPulse"}'),
        ]
        for env in cases:
            llm_client.reset_state()
            with provider_env(**env):
                cfg = llm_client.provider_config()
                client = llm_client.get_client(cfg)
                self.assertIsNotNone(client, cfg["provider"])
                if cfg["provider"] == "azure_foundry":
                    self.assertEqual(str(client.base_url), "https://r.services.ai.azure.com/openai/v1/")
                if cfg["provider"] == "custom":
                    self.assertEqual(str(client.base_url).rstrip("/"), "http://localhost:11434/v1")


class RouteTests(unittest.TestCase):
    def setUp(self):
        os.environ["ADVICE_MODE"] = "fallback"
        self.client, self.db, self.ids = make_app()
        self.admin = {"x-auth-token": node_token(self.ids["Admin"], "Admin")}
        self.nimal = {"x-auth-token": node_token(self.ids["Nimal"], "Student")}
        self.kamala = {"x-auth-token": flask_token(self.ids["Kamala"], "kamala@my.sliit.lk")}

    def tearDown(self):
        os.environ.pop("ADVICE_MODE", None)

    def send(self, items):
        return self.client.post("/api/advice/admin/send", json={"items": items}, headers=self.admin)

    def test_requires_login(self):
        self.assertEqual(self.client.get("/api/advice/my").status_code, 401)
        bad = {"x-auth-token": "not-a-token"}
        self.assertEqual(self.client.get("/api/advice/my", headers=bad).status_code, 401)

    def test_students_cannot_use_staff_endpoints(self):
        for url in ["/api/advice/admin/students", "/api/advice/dummy-students"]:
            self.assertEqual(self.client.get(url, headers=self.nimal).status_code, 403)
        res = self.client.post("/api/advice/admin/send", json={"items": [{"email": "kamala@my.sliit.lk",
                               "record": DUMMY_STUDENTS[0]["record"]}]}, headers=self.kamala)
        self.assertEqual(res.status_code, 403)

    def test_whoami_with_both_token_formats(self):
        me = self.client.get("/api/advice/whoami", headers=self.admin).get_json()
        self.assertTrue(me["is_staff"])
        me = self.client.get("/api/advice/whoami", headers=self.kamala).get_json()
        self.assertEqual(me["role"], "Student")
        self.assertFalse(me["is_staff"])

    def test_each_student_sees_only_their_own_advice(self):
        res = self.send([
            {"user_id": self.ids["Nimal"], "record": DUMMY_STUDENTS[0]["record"], "course_code": "IT2040"},
            {"email": "kamala@my.sliit.lk", "record": DUMMY_STUDENTS[6]["record"], "course_code": "IT1050"},
            {"email": "nobody@x.lk", "record": DUMMY_STUDENTS[1]["record"]},
        ])
        body = res.get_json()
        self.assertEqual(body["sent"], 2)
        self.assertFalse(body["results"][2]["ok"])

        nimal = self.client.get("/api/advice/my", headers=self.nimal).get_json()
        kamala = self.client.get("/api/advice/my", headers=self.kamala).get_json()
        self.assertEqual(len(nimal["latest"]), 1)
        self.assertEqual(nimal["latest"][0]["input"]["academic_risk_level"], "High")
        self.assertEqual(kamala["latest"][0]["input"]["academic_risk_level"], "Low")
        # record was re-labelled with the user's own pseudonymous id
        self.assertEqual(nimal["latest"][0]["student_id"], "STU-" + self.ids["Nimal"][-6:].upper())
        self.assertEqual(nimal["unread"], 1)

        # Kamala cannot open Nimal's advice even with its id
        nimal_advice_id = nimal["latest"][0]["id"]
        self.assertEqual(self.client.get(f"/api/advice/my/{nimal_advice_id}", headers=self.kamala).status_code, 404)
        self.assertEqual(self.client.get(f"/api/advice/my/{nimal_advice_id}", headers=self.nimal).status_code, 200)

        # mark read
        self.client.post(f"/api/advice/my/{nimal_advice_id}/read", headers=self.nimal)
        self.assertEqual(self.client.get("/api/advice/my", headers=self.nimal).get_json()["unread"], 0)

        # staff overview
        students = self.client.get("/api/advice/admin/students", headers=self.admin).get_json()
        by_name = {s["name"]: s for s in students}
        self.assertNotIn("Admin", by_name)
        self.assertTrue(by_name["Nimal"]["last_advice"]["read"])
        self.assertEqual(by_name["Kamala"]["last_advice"]["course_code"], "IT1050")
        self.assertEqual(self.db["c1_risk_outputs"].count_documents({}), 2)

    def test_invalid_record_is_not_sent(self):
        res = self.send([{"user_id": self.ids["Nimal"], "record": {"academic_risk_level": "High", "attendance": 140}}])
        self.assertEqual(res.get_json()["sent"], 0)
        self.assertEqual(self.db["c2_advice"].count_documents({}), 0)

    def test_parse_csv_routes_rows_by_email(self):
        csv_text = ("email,previous_gpa,attendance,assignment_score,quiz_score,study_hours,"
                    "engagement_score,late_assignments,completed_assignments,learning_progress,"
                    "academic_risk_level,course_code\n"
                    "nimal@my.sliit.lk,2.8,65,55,48,6,40,2,5,45,High,IT1010\n"
                    "KAMALA@my.sliit.lk,3.6,92,85,80,15,80,0,8,75,Low,\n"
                    "ghost@my.sliit.lk,3.0,70,60,60,8,50,1,6,55,Medium,\n"
                    "nimal@my.sliit.lk,3.0,abc,60,60,8,50,1,6,55,Medium,\n")
        body = self.client.post("/api/advice/parse", json={"text": csv_text}, headers=self.admin).get_json()
        self.assertEqual(body["count"], 4)
        self.assertEqual(body["valid"], 2)
        self.assertEqual(body["rows"][0]["course_code"], "IT1010")
        self.assertEqual(body["rows"][1]["name"], "Kamala")

    def test_llm_test_endpoint_is_staff_only(self):
        self.assertEqual(self.client.post("/api/advice/admin/llm-test", headers=self.nimal).status_code, 403)
        body = self.client.post("/api/advice/admin/llm-test", headers=self.admin).get_json()
        self.assertFalse(body["ok"])  # ADVICE_MODE=fallback in these tests

    def test_preview_does_not_save(self):
        res = self.client.post("/api/advice/generate", json=DUMMY_STUDENTS[2], headers=self.admin)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.db["c2_advice"].count_documents({}), 0)

    # ------------------------------------------------------------------
    # Import without sending (pending records)
    # ------------------------------------------------------------------

    def _import(self, items):
        return self.client.post("/api/advice/admin/import", json={"items": items}, headers=self.admin)

    def test_import_only_saves_pending_without_advice(self):
        body = self._import([
            {"user_id": self.ids["Nimal"], "record": DUMMY_STUDENTS[0]["record"], "course_code": "IT2040"},
            {"email": "nobody@x.lk", "record": DUMMY_STUDENTS[1]["record"]},
        ]).get_json()
        self.assertEqual(body["imported"], 1)
        self.assertFalse(body["results"][1]["ok"])
        # stored as pending, and NO advice was generated
        self.assertEqual(self.db["c1_risk_outputs"].count_documents({"status": "pending"}), 1)
        self.assertEqual(self.db["c2_advice"].count_documents({}), 0)
        # the student sees nothing yet
        nimal = self.client.get("/api/advice/my", headers=self.nimal).get_json()
        self.assertEqual(nimal["latest"], [])
        # it shows up in the staff pending list, which students cannot access
        pending = self.client.get("/api/advice/admin/pending", headers=self.admin).get_json()
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["name"], "Nimal")
        self.assertEqual(pending[0]["course_code"], "IT2040")
        self.assertEqual(self.client.get("/api/advice/admin/pending", headers=self.nimal).status_code, 403)

    def test_pending_record_can_be_sent_later(self):
        pid = self._import([{"user_id": self.ids["Nimal"], "record": DUMMY_STUDENTS[0]["record"],
                             "course_code": "IT2040"}]).get_json()["results"][0]["pending_id"]
        res = self.client.post("/api/advice/admin/pending/send", json={"ids": [pid]},
                               headers=self.admin).get_json()
        self.assertEqual(res["sent"], 1)
        self.assertEqual(res["results"][0]["risk_level"], "High")
        # advice now exists and the record is no longer pending
        self.assertEqual(self.db["c2_advice"].count_documents({}), 1)
        self.assertEqual(self.db["c1_risk_outputs"].find_one()["status"], "sent")
        nimal = self.client.get("/api/advice/my", headers=self.nimal).get_json()
        self.assertEqual(len(nimal["latest"]), 1)
        # a record cannot be sent twice
        again = self.client.post("/api/advice/admin/pending/send", json={"ids": [pid]},
                                 headers=self.admin).get_json()
        self.assertEqual(again["sent"], 0)
        self.assertEqual(self.db["c2_advice"].count_documents({}), 1)

    def test_pending_record_can_be_discarded(self):
        pid = self._import([{"user_id": self.ids["Nimal"], "record": DUMMY_STUDENTS[0]["record"],
                             "course_code": "IT2040"}]).get_json()["results"][0]["pending_id"]
        self.assertEqual(self.client.delete(f"/api/advice/admin/pending/{pid}", headers=self.admin).status_code, 200)
        self.assertEqual(self.db["c1_risk_outputs"].count_documents({}), 0)
        # deleting again (or a sent record) returns 404
        self.assertEqual(self.client.delete(f"/api/advice/admin/pending/{pid}", headers=self.admin).status_code, 404)


if __name__ == "__main__":
    unittest.main()
