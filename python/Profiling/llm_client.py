"""
LLM connection layer for the advice engine.

Supported providers (set LLM_PROVIDER, or leave it empty to auto-detect):

  openai         api.openai.com
                   OPENAI_API_KEY, OPENAI_MODEL
  azure_foundry  Microsoft Foundry / Azure AI Foundry, OpenAI v1 API
                 (Azure OpenAI models AND Foundry models such as DeepSeek, Llama, Mistral, Grok)
                   AZURE_FOUNDRY_ENDPOINT   e.g. https://<resource>.services.ai.azure.com
                                            or   https://<resource>.openai.azure.com
                   AZURE_FOUNDRY_API_KEY    (or AZURE_FOUNDRY_AUTH=entra for keyless login)
                   AZURE_FOUNDRY_MODEL      your deployment name
  azure_openai   classic Azure OpenAI API with api-version
                   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
                   AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION
  custom         any OpenAI-compatible endpoint (LM Studio, Ollama, vLLM, LiteLLM,
                 OpenRouter, a company gateway, ...)
                   CUSTOM_OPENAI_BASE_URL   e.g. http://localhost:11434/v1
                   CUSTOM_OPENAI_API_KEY    (optional for local servers)
                   CUSTOM_OPENAI_MODEL
                   CUSTOM_OPENAI_HEADERS    optional JSON, e.g. {"X-Title": "EduPulse"}

Not every endpoint supports strict JSON-schema output, so chat_json() tries
  json_schema -> json_object -> plain prompt
and remembers what worked (LLM_JSON_MODE can force one of them).
"""

import json
import os
import re
import threading
from urllib.parse import urlparse

DEFAULT_MODEL = "gpt-4.1-mini"
PROVIDER_LABELS = {
    "openai": "OpenAI",
    "azure_foundry": "Azure AI Foundry",
    "azure_openai": "Azure OpenAI",
    "custom": "Custom endpoint",
    "rule_based_fallback": "Offline rule-based",
}
JSON_MODES = ("json_schema", "json_object", "prompt")

# When a reply is cut off at the output-token cap (finish_reason == "length"), the call is
# retried with a doubled budget up to this ceiling. Reasoning models (e.g. gpt-5 family)
# also spend "thinking" tokens from the same budget, so generous retries matter.
MAX_OUTPUT_TOKENS = 16000


def _env(name, default=None):
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


# --------------------------------------------------------------------------
# Provider configuration
# --------------------------------------------------------------------------

def foundry_base_url(endpoint):
    """Turn whatever the user pasted from the Foundry portal into .../openai/v1/."""
    endpoint = endpoint.strip()
    if "/openai/v1" in endpoint:
        return endpoint.split("/openai/v1")[0].rstrip("/") + "/openai/v1/"
    parsed = urlparse(endpoint if "://" in endpoint else "https://" + endpoint)
    # project URLs (/api/projects/...) and /models URLs -> keep only the host
    return f"{parsed.scheme}://{parsed.netloc}/openai/v1/"


def provider_config():
    """Resolve the active provider from environment variables (no secrets returned)."""
    if _env("ADVICE_MODE", "auto").lower() == "fallback":
        return {"provider": "rule_based_fallback", "configured": False, "model": None,
                "reason": "ADVICE_MODE=fallback"}

    wanted = (_env("LLM_PROVIDER") or "").lower()
    if not wanted:  # auto-detect
        if _env("AZURE_FOUNDRY_ENDPOINT"):
            wanted = "azure_foundry"
        elif _env("AZURE_OPENAI_ENDPOINT"):
            wanted = "azure_openai"
        elif _env("CUSTOM_OPENAI_BASE_URL") or _env("OPENAI_BASE_URL"):
            wanted = "custom"
        elif _env("OPENAI_API_KEY"):
            wanted = "openai"

    cfg = {"provider": wanted or "rule_based_fallback", "configured": False, "model": None,
           "endpoint": None, "reason": None}

    if wanted == "openai":
        cfg.update(model=_env("OPENAI_MODEL", DEFAULT_MODEL), endpoint="api.openai.com",
                   api_key=_env("OPENAI_API_KEY"))
        missing = [] if cfg["api_key"] else ["OPENAI_API_KEY"]

    elif wanted == "azure_foundry":
        endpoint = _env("AZURE_FOUNDRY_ENDPOINT")
        auth = (_env("AZURE_FOUNDRY_AUTH", "key")).lower()
        cfg.update(model=_env("AZURE_FOUNDRY_MODEL"), auth=auth,
                   base_url=foundry_base_url(endpoint) if endpoint else None,
                   api_key=_env("AZURE_FOUNDRY_API_KEY"))
        cfg["endpoint"] = urlparse(cfg["base_url"]).netloc if cfg["base_url"] else None
        missing = [k for k, v in [("AZURE_FOUNDRY_ENDPOINT", endpoint),
                                  ("AZURE_FOUNDRY_MODEL", cfg["model"])] if not v]
        if auth != "entra" and not cfg["api_key"]:
            missing.append("AZURE_FOUNDRY_API_KEY (or AZURE_FOUNDRY_AUTH=entra)")

    elif wanted == "azure_openai":
        endpoint = _env("AZURE_OPENAI_ENDPOINT")
        cfg.update(model=_env("AZURE_OPENAI_DEPLOYMENT"), azure_endpoint=endpoint,
                   api_key=_env("AZURE_OPENAI_API_KEY"),
                   api_version=_env("AZURE_OPENAI_API_VERSION", "2024-10-21"),
                   endpoint=urlparse(endpoint).netloc if endpoint else None)
        missing = [k for k, v in [("AZURE_OPENAI_ENDPOINT", endpoint),
                                  ("AZURE_OPENAI_API_KEY", cfg["api_key"]),
                                  ("AZURE_OPENAI_DEPLOYMENT", cfg["model"])] if not v]

    elif wanted == "custom":
        base = _env("CUSTOM_OPENAI_BASE_URL") or _env("OPENAI_BASE_URL")
        cfg.update(model=_env("CUSTOM_OPENAI_MODEL") or _env("OPENAI_MODEL"),
                   base_url=base,
                   api_key=_env("CUSTOM_OPENAI_API_KEY") or _env("OPENAI_API_KEY") or "not-needed",
                   endpoint=urlparse(base).netloc if base else None)
        headers = _env("CUSTOM_OPENAI_HEADERS")
        try:
            cfg["headers"] = json.loads(headers) if headers else {}
        except json.JSONDecodeError:
            cfg["headers"] = {}
            cfg["reason"] = "CUSTOM_OPENAI_HEADERS is not valid JSON (ignored)"
        missing = [k for k, v in [("CUSTOM_OPENAI_BASE_URL", base),
                                  ("CUSTOM_OPENAI_MODEL", cfg["model"])] if not v]

    elif wanted:
        missing = [f"LLM_PROVIDER '{wanted}' is unknown (use openai, azure_foundry, azure_openai or custom)"]
    else:
        missing = ["an LLM provider (see python/.env.example)"]

    if missing:
        cfg["reason"] = "Missing " + ", ".join(missing)
    else:
        cfg["configured"] = True
    return cfg


def public_info():
    """Provider status that is safe to send to the browser."""
    cfg = provider_config()
    with _state_lock:
        mode = _json_mode_cache.get(_cfg_key(cfg))
    return {
        "provider": cfg["provider"] if cfg["configured"] else "rule_based_fallback",
        "configured_provider": cfg["provider"],
        "label": PROVIDER_LABELS.get(cfg["provider"], cfg["provider"]),
        "configured": cfg["configured"],
        "model": cfg.get("model"),
        "endpoint": cfg.get("endpoint"),
        "json_mode": _env("LLM_JSON_MODE") or mode or "auto",
        "reason": cfg.get("reason"),
    }


# --------------------------------------------------------------------------
# Client creation (cached per configuration)
# --------------------------------------------------------------------------

_state_lock = threading.Lock()
_clients = {}
_json_mode_cache = {}     # cfg key -> json mode that worked
_token_param_cache = {}   # cfg key -> "max_completion_tokens" | "max_tokens"


def _cfg_key(cfg):
    return (cfg["provider"], cfg.get("base_url") or cfg.get("azure_endpoint"), cfg.get("model"))


def _entra_token_provider():
    try:
        from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    except ImportError as exc:
        raise RuntimeError("AZURE_FOUNDRY_AUTH=entra needs: pip install azure-identity "
                           "(and 'az login' on this computer)") from exc
    return get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")


def get_client(cfg):
    key = _cfg_key(cfg)
    with _state_lock:
        if key in _clients:
            return _clients[key]

    from openai import AzureOpenAI, OpenAI  # lazy import: offline mode works without the package

    timeout = float(_env("OPENAI_TIMEOUT", "60"))
    provider = cfg["provider"]
    if provider == "azure_openai":
        client = AzureOpenAI(azure_endpoint=cfg["azure_endpoint"], api_key=cfg["api_key"],
                             api_version=cfg["api_version"], timeout=timeout, max_retries=1)
    elif provider == "azure_foundry":
        if cfg.get("auth") == "entra":
            client = OpenAI(base_url=cfg["base_url"], api_key=_entra_token_provider(),
                            timeout=timeout, max_retries=1)
        else:
            client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"],
                            default_headers={"api-key": cfg["api_key"]},
                            timeout=timeout, max_retries=1)
    elif provider == "custom":
        client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"],
                        default_headers=cfg.get("headers") or None, timeout=timeout, max_retries=1)
    else:
        client = OpenAI(api_key=cfg["api_key"], timeout=timeout, max_retries=1)

    with _state_lock:
        _clients[key] = client
    return client


def reset_state():
    """Forget cached clients and detected capabilities (used by tests / after .env changes)."""
    with _state_lock:
        _clients.clear()
        _json_mode_cache.clear()
        _token_param_cache.clear()


# --------------------------------------------------------------------------
# JSON helpers
# --------------------------------------------------------------------------

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def extract_json(text):
    """Parse JSON from a model reply that may contain <think> blocks or ``` fences."""
    if not text:
        raise ValueError("Empty response from the model")
    text = _THINK_RE.sub("", text).strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _is_capability_error(exc):
    """True when the endpoint rejected a parameter (so a simpler mode may work)."""
    name = type(exc).__name__
    status = getattr(exc, "status_code", None)
    if name in ("BadRequestError", "UnprocessableEntityError") or status in (400, 422):
        return True
    msg = str(exc).lower()
    return any(s in msg for s in ("response_format", "json_schema", "not supported", "unsupported",
                                  "unrecognized", "extra inputs", "max_completion_tokens"))


def _schema_instruction(schema):
    return ("\n\nReturn ONLY one JSON object (no markdown, no extra text) that matches this "
            "JSON schema exactly:\n" + json.dumps(schema))


# --------------------------------------------------------------------------
# Main call
# --------------------------------------------------------------------------

def chat_json(system_prompt, user_prompt, schema, schema_name="result", max_tokens=2500):
    """
    Ask the configured model for a JSON object. Returns (data, meta).
    Raises on failure so the caller can fall back to the rule-based advice.
    """
    cfg = provider_config()
    if not cfg["configured"]:
        raise RuntimeError(cfg.get("reason") or "LLM not configured")
    client = get_client(cfg)
    key = _cfg_key(cfg)

    forced = (_env("LLM_JSON_MODE") or "").lower()
    with _state_lock:
        remembered = _json_mode_cache.get(key)
        token_param = _token_param_cache.get(key, "max_completion_tokens")
    if forced in JSON_MODES:
        modes = [forced]
    elif remembered:
        modes = list(JSON_MODES[JSON_MODES.index(remembered):])
    else:
        modes = list(JSON_MODES)

    last_error = None
    for mode in modes:
        system = system_prompt if mode == "json_schema" else system_prompt + _schema_instruction(schema)
        kwargs = {
            "model": cfg["model"],
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_prompt}],
        }
        if mode == "json_schema":
            kwargs["response_format"] = {"type": "json_schema",
                                         "json_schema": {"name": schema_name, "strict": True, "schema": schema}}
        elif mode == "json_object":
            kwargs["response_format"] = {"type": "json_object"}

        for attempt_param in dict.fromkeys([token_param, "max_tokens", "max_completion_tokens"]):
            budget = max_tokens
            wrong_param = False
            while True:
                call = {**kwargs, attempt_param: budget}
                try:
                    response = client.chat.completions.create(**call)
                except Exception as exc:  # noqa: BLE001 - classify below
                    last_error = exc
                    msg = str(exc).lower()
                    wrong_param = _is_capability_error(exc) and ("max_completion_tokens" in msg
                                                                 or "max_tokens" in msg)
                    break
                choice = response.choices[0]
                message = choice.message
                if getattr(message, "refusal", None):
                    raise ValueError(f"Model refused: {message.refusal}")
                truncated = getattr(choice, "finish_reason", "") == "length"
                try:
                    data = extract_json(message.content)
                except (ValueError, json.JSONDecodeError) as exc:
                    last_error = exc
                    if truncated and budget < MAX_OUTPUT_TOKENS:
                        # reply was cut off mid-JSON at the token cap: same call, bigger budget
                        budget = min(budget * 2, MAX_OUTPUT_TOKENS)
                        continue
                    break  # genuine JSON problem: try the next (simpler) mode
                with _state_lock:
                    _json_mode_cache[key] = mode
                    _token_param_cache[key] = attempt_param
                usage = getattr(response, "usage", None)
                return data, {
                    "provider": cfg["provider"],
                    "model": getattr(response, "model", None) or cfg["model"],
                    "json_mode": mode,
                    "tokens": getattr(usage, "total_tokens", None) if usage else None,
                }
            if wrong_param:
                continue  # retry the same mode with the other token parameter
            break  # parse failure or API error: judged at the mode level below

        if last_error is not None and not (_is_capability_error(last_error)
                                           or isinstance(last_error, (ValueError, json.JSONDecodeError))):
            raise last_error  # auth / network / not found: a simpler mode will not help

    raise last_error or RuntimeError("No JSON mode worked")


def test_connection():
    """Small round-trip used by the staff 'Test connection' button and the CLI."""
    import time
    schema = {"type": "object", "additionalProperties": False, "required": ["status", "message"],
              "properties": {"status": {"type": "string"}, "message": {"type": "string"}}}
    started = time.time()
    data, meta = chat_json("You are a connection test. Reply with status 'ok' and a 5-word greeting.",
                           "Test the connection.", schema, "connection_test", max_tokens=200)
    return {"ok": True, "reply": data, **meta, "latency_ms": int((time.time() - started) * 1000)}


if __name__ == "__main__":
    # python -m Profiling.llm_client   (run from the python/ folder)
    from dotenv import load_dotenv
    load_dotenv()
    info = public_info()
    print("Provider :", info["label"], "| configured:", info["configured"])
    print("Model    :", info["model"])
    print("Endpoint :", info["endpoint"])
    if not info["configured"]:
        print("Problem  :", info["reason"])
        raise SystemExit(1)
    try:
        result = test_connection()
        print("Result   : OK - JSON mode", result["json_mode"], "|", result["latency_ms"], "ms")
        print("Reply    :", json.dumps(result["reply"])[:300])
    except Exception as exc:  # noqa: BLE001
        print("FAILED   :", type(exc).__name__, str(exc)[:500])
        raise SystemExit(1)
