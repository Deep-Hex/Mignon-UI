# llm_client.py
"""
app/services/llm_client.py
---------------------------
Async LLM streaming client supporting OpenRouter (cloud) and local backends
(Ollama, Kobold.cpp) via the OpenAI-compatible Chat Completions SSE format.

Yields internal SSE events in the shape ``data: {"text": "<token>"}`` so that
callers (generation_service) can accumulate tokens without parsing raw SSE.
"""

import json
from collections.abc import AsyncGenerator

import httpx

from app.core.database import Settings

# Global shared HTTPX async client for connection pooling
_client: httpx.AsyncClient | None = None

def get_httpx_client() -> httpx.AsyncClient:
    """Get or initialize the shared global HTTPX AsyncClient with connection pooling."""
    global _client
    if _client is None:
        # 60s timeout for streaming responses, 10s TCP connect timeout
        timeout = httpx.Timeout(60.0, connect=10.0)
        _client = httpx.AsyncClient(timeout=timeout)
    return _client


async def close_httpx_client() -> None:
    """Gracefully close the shared HTTPX client on application shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        print("[LLM Client] Shared HTTP connection pool finalized.")


def _resolve_llm_endpoint(settings: Settings) -> tuple[str, str, dict[str, str]]:
    """
    Resolve the OpenAI-compatible Completions URL, selected model, and HTTP headers
    based on settings provider configuration.
    """
    headers: dict[str, str] = {}

    if settings.provider == "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions"
        from app.core.security import decrypt_key
        decrypted_key = decrypt_key(settings.openrouter_key)
        headers["Authorization"] = f"Bearer {decrypted_key}"
        headers["HTTP-Referer"] = "https://github.com/deepak-raven/Darf-UI"
        headers["X-Title"] = "Darf UI"
        model_name = settings.selected_model
    else:
        url = settings.local_endpoint or "http://127.0.0.1:11434/v1"
        if url.endswith("/v1") or url.endswith("/v1/"):
            url = f"{url.rstrip('/')}/chat/completions"
        model_name = settings.selected_model

    return url, model_name, headers


async def stream_llm_response(
    settings: Settings,
    system_prompt: str,
    history_str: str,
) -> AsyncGenerator[str, None]:
    """
    Stream an LLM chat completion and yield normalised SSE data lines.

    Supports:
      - **OpenRouter** (cloud): uses the OpenRouter API with Bearer auth.
      - **Local backends** (Ollama, Kobold): uses the local endpoint's
        OpenAI-compatible ``/chat/completions`` endpoint.

    Each yielded string is a complete SSE line in one of two shapes:
      - ``data: {"text": "<token>"}``   — a streamed token
      - ``data: {"error": "<message>"}`` — a fatal error

    Args:
        settings:     Application settings containing provider, endpoint, model,
                      temperature, and max_tokens configuration.
        system_prompt: The compiled system prompt string.
        history_str:   The formatted chat history user turn.

    Yields:
        SSE-formatted data strings.
    """
    url, model_name, headers = _resolve_llm_endpoint(settings)

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": history_str},
        ],
        "temperature": settings.temperature or 0.9,
        "max_tokens": settings.max_tokens or 2048,
        "stream": True,
    }
    headers["Content-Type"] = "application/json"
    client = get_httpx_client()

    try:
        async with client.stream("POST", url, headers=headers, json=payload, timeout=60.0) as response:
            if response.status_code != 200:
                err_body = await response.aread()
                yield f"data: {json.dumps({'error': f'LLM API returned status {response.status_code}: {err_body.decode()}'})}\n\n"
                return

            async for line in response.aiter_lines():
                line = line.strip()
                if not line:
                    continue
                if not line.startswith("data:"):
                    continue
                data_content = line[5:].strip()
                if data_content == "[DONE]":
                    continue

                token = _extract_token(data_content)
                if token:
                    yield f"data: {json.dumps({'text': token})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'error': f'Request failed: {exc}'})}\n\n"


def _extract_token(data_content: str) -> str | None:
    """
    Extract a text token from an SSE data payload.

    Tries the standard OpenAI ``choices[].delta.content`` path first, then
    falls back to the Ollama-native ``message.content`` path.

    Args:
        data_content: The raw JSON string from an SSE ``data:`` line.

    Returns:
        The extracted text token, or ``None`` if none was found.
    """
    try:
        parsed = json.loads(data_content)
        # Standard OpenAI / Kobold
        if "choices" in parsed and parsed["choices"]:
            return parsed["choices"][0].get("delta", {}).get("content") or None
        # Ollama-native streaming format
        return parsed.get("message", {}).get("content") or None
    except Exception:
        return None


async def query_llm_non_stream(
    settings: Settings,
    system_prompt: str,
    user_prompt: str,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """
    Query the LLM synchronously (non-streaming) and return the full text response.
    Supports optional parameter overrides, falling back to global settings defaults.
    """
    url, model_name, headers = _resolve_llm_endpoint(settings)

    resolved_temp = temperature if temperature is not None else (settings.temperature or 0.9)
    resolved_tokens = max_tokens if max_tokens is not None else (settings.max_tokens or 2048)

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": resolved_temp,
        "max_tokens": resolved_tokens,
        "stream": False,
    }
    headers["Content-Type"] = "application/json"

    client = get_httpx_client()

    try:
        res = await client.post(url, headers=headers, json=payload, timeout=45.0)
        if res.status_code == 200:
            parsed = res.json()
            if "choices" in parsed and parsed["choices"]:
                return parsed["choices"][0].get("message", {}).get("content") or ""
    except Exception as exc:
        print(f"[LLM Client] Non-stream query failed: {exc}")
    return ""
