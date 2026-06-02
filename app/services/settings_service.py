"""
app/services/settings_service.py
----------------------------------
Business logic for settings read/write and LLM engine connection probing.

The connection-probing logic (previously embedded inline in the settings router)
lives here so it can be tested and reused independently of HTTP concerns.
"""

import httpx
from sqlalchemy.orm import Session

from app.core.database import Settings
from app.schemas.schemas import SettingsUpdate

# ── Read / Write ──────────────────────────────────────────────────────────────

def get_settings(db: Session) -> Settings:
    """
    Fetch the singleton settings row, creating it with defaults if absent.

    Args:
        db: Active database session.

    Returns:
        The Settings ORM object (id=1).
    """
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, data: SettingsUpdate) -> Settings:
    """
    Apply a validated settings payload to the singleton settings row.

    Normalises local_endpoint defaults per provider so callers don't need to
    remember provider-specific port numbers.

    Args:
        db:   Active database session.
        data: Validated update payload.

    Returns:
        The updated Settings ORM object.
    """
    settings = get_settings(db)

    settings.provider = data.provider

    # Process openrouter_key safely to protect existing unmasked keys from overwrite
    if data.openrouter_key:
        is_masked = (
            data.openrouter_key.startswith("sk-or-v1-**") or
            "*" in data.openrouter_key or
            data.openrouter_key == "********"
        )
        if not is_masked:
            from app.core.security import encrypt_key
            settings.openrouter_key = encrypt_key(data.openrouter_key)
    else:
        settings.openrouter_key = None

    _DEFAULT_ENDPOINTS: dict[str, str] = {
        "kobold": "http://127.0.0.1:5001/v1",
        "ollama": "http://127.0.0.1:11434/v1",
    }
    settings.local_endpoint = data.local_endpoint or _DEFAULT_ENDPOINTS.get(
        data.provider, "http://127.0.0.1:11434/v1"
    )

    settings.selected_model = data.selected_model
    settings.temperature = data.temperature
    settings.max_tokens = data.max_tokens
    settings.system_template = data.system_template
    settings.persona_name = data.persona_name or "User"

    from app.services.image_helper import save_base64_avatar
    settings.persona_avatar = save_base64_avatar(data.persona_avatar, "persona")

    settings.persona_description = data.persona_description
    settings.persona_character_id = data.persona_character_id
    settings.cloud_rate_limit = data.cloud_rate_limit if data.cloud_rate_limit is not None else 15

    db.commit()
    db.refresh(settings)
    return settings


# ── Connection Probing ────────────────────────────────────────────────────────

async def probe_llm_connection(db: Session, settings: Settings) -> dict:
    """
    Test connectivity to the configured LLM backend and return a status dict.

    For OpenRouter: validates the API key against the models endpoint.
    For local backends (Ollama / Kobold): probes the local endpoint, attempts to
    detect the currently loaded model, and auto-updates settings.selected_model
    if it discovers a definitive active model name.

    Args:
        db:       Active database session (used to persist auto-detected model).
        settings: Current Settings ORM object.

    Returns:
        Dict with keys:
          - ``status``: "success" | "error"
          - ``message``: Human-readable status string.
          - ``active_model``: Detected model name if available (success only).
    """
    if settings.provider == "openrouter":
        return await _probe_openrouter(settings)
    return await _probe_local(db, settings)


async def _probe_openrouter(settings: Settings) -> dict:
    """Check OpenRouter API key validity via the /models listing endpoint."""
    if not settings.openrouter_key:
        return {"status": "error", "message": "API key missing"}
    try:
        from app.core.security import decrypt_key
        decrypted_key = decrypt_key(settings.openrouter_key)
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {decrypted_key}"},
                timeout=3.0,
            )
            if res.status_code == 200:
                return {"status": "success", "message": "OpenRouter Online"}
            return {"status": "error", "message": f"OpenRouter status {res.status_code}"}
    except Exception as exc:
        return {"status": "error", "message": f"OpenRouter offline: {exc}"}


async def _probe_local(db: Session, settings: Settings) -> dict:
    """
    Multi-step probe for local Ollama / Kobold backends.

    Strategy:
      1. Try the standard OpenAI-compatible /v1/models endpoint.
      2. Fall back to provider-native endpoints (/api/v1/model for Kobold,
         /api/ps for Ollama) to detect the CURRENTLY RUNNING model.
      3. For Ollama only: further fall back to /api/tags if nothing is actively
         loaded in memory (returns installed models).
      4. Fall back to a root GET to confirm the server is alive.
    """
    endpoint = settings.local_endpoint or (
        "http://127.0.0.1:5001/v1" if settings.provider == "kobold"
        else "http://127.0.0.1:11434/v1"
    )

    # Quick TCP port pre-flight check to avoid slow timeouts on dead local servers
    import socket
    from urllib.parse import urlparse

    try:
        parsed = urlparse(endpoint)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port
        if not port:
            port = 80 if parsed.scheme == "http" else 443

        # Fast socket probe (timeout = 0.15s)
        with socket.create_connection((host, port), timeout=0.15):
            pass
    except Exception:
        # Port is closed - server is down. Return offline immediately!
        return {"status": "error", "message": f"{settings.provider.title()} Offline"}

    # Normalise base URL (strip trailing /chat/completions if present)
    base = endpoint.split("/v1")[0] if "/v1" in endpoint else endpoint
    base = base.replace("/chat/completions", "").rstrip("/")
    models_url = f"{base}/v1/models"

    active_model: str | None = None
    connection_success = False

    try:
        async with httpx.AsyncClient() as client:
            # 1. Standard OpenAI-compat /v1/models (skip auto-pick — just confirm connectivity)
            try:
                res = await client.get(models_url, timeout=2.0)
                if res.status_code == 200:
                    connection_success = True
            except Exception:
                pass

            # 2. Provider-native: detect the ACTIVELY RUNNING model
            if not active_model:
                try:
                    if settings.provider == "kobold":
                        res_native = await client.get(f"{base}/api/v1/model", timeout=1.5)
                        if res_native.status_code == 200:
                            connection_success = True
                            active_model = res_native.json().get("result")
                    elif settings.provider == "ollama":
                        # /api/ps returns models currently loaded in memory (RUNNING)
                        res_ps = await client.get(f"{base}/api/ps", timeout=1.5)
                        if res_ps.status_code == 200:
                            connection_success = True
                            running_models = res_ps.json().get("models", [])
                            # Filter out embedding/vector models (they are not chat/roleplay models)
                            EMBED_KEYWORDS = ("embed", "bge", "minilm", "e5-", "nomic", "gte-")
                            running_chat_models = [
                                m for m in running_models
                                if not any(kw in m.get("name", "").lower() for kw in EMBED_KEYWORDS)
                            ]
                            if running_chat_models:
                                # Pick the first actively loaded running chat model
                                active_model = running_chat_models[0].get("name")

                        # Fallback: nothing running right now — list installed models
                        if not active_model:
                            res_tags = await client.get(f"{base}/api/tags", timeout=1.5)
                            if res_tags.status_code == 200:
                                connection_success = True
                                installed = res_tags.json().get("models", [])
                                # Filter out embedding/vector models (they are not chat models)
                                EMBED_KEYWORDS = ("embed", "bge", "minilm", "e5-", "nomic", "gte-")
                                chat_models = [
                                    m for m in installed
                                    if not any(kw in m.get("name", "").lower() for kw in EMBED_KEYWORDS)
                                ]
                                if chat_models:
                                    active_model = chat_models[0].get("name")
                                elif installed:
                                    active_model = installed[0].get("name")
                except Exception:
                    pass

            # 3. Root server alive check
            if not connection_success:
                try:
                    res_fallback = await client.get(base, timeout=1.5)
                    body = res_fallback.text
                    if res_fallback.status_code == 200 or any(
                        kw in body for kw in ("Ollama", "Kobold", "lite")
                    ):
                        connection_success = True
                except Exception:
                    pass

            if not connection_success:
                return {"status": "error", "message": f"{settings.provider.title()} unreachable"}

            # Auto-update selected_model if we detected one
            if active_model and settings.selected_model != active_model:
                settings.selected_model = active_model
                db.commit()
                db.refresh(settings)

            return {
                "status": "success",
                "message": f"{settings.provider.title()} Online",
                "active_model": active_model or settings.selected_model,
            }

    except Exception:
        return {"status": "error", "message": f"{settings.provider.title()} Offline"}
