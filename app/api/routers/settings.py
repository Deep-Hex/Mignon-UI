"""
app/api/routers/settings.py
-----------------------------
HTTP endpoints for application settings and LLM engine status.

All business logic is delegated to app.services.settings_service.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.schemas import SettingsRead, SettingsUpdate
from app.services import settings_service

router = APIRouter()


def _mask_settings_response(settings) -> dict:
    """Helper to convert Settings ORM model to dictionary and mask OpenRouter API key."""
    settings_dict = {
        c.name: getattr(settings, c.name) for c in settings.__table__.columns
    }
    raw_key = settings_dict.get("openrouter_key")
    if raw_key:
        from app.core.security import decrypt_key
        key = decrypt_key(raw_key)
        if key:
            if len(key) > 16:
                settings_dict["openrouter_key"] = f"{key[:12]}" + "*" * (len(key) - 12)
            else:
                settings_dict["openrouter_key"] = "********"
        else:
            settings_dict["openrouter_key"] = ""
    return settings_dict


@router.get("", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve the active LLM provider configuration and player persona."""
    settings = settings_service.get_settings(db)
    return _mask_settings_response(settings)


@router.post("", response_model=SettingsRead)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    """Update global LLM provider, model, generation parameters, and persona."""
    settings = settings_service.update_settings(db, data)
    return _mask_settings_response(settings)


@router.get("/test-connection")
async def test_connection(db: Session = Depends(get_db)):
    """
    Probe the configured LLM backend and return its online status.

    Acts as a server-side proxy to avoid CORS issues when the frontend
    tries to reach local AI backends directly.
    """
    settings = settings_service.get_settings(db)
    return await settings_service.probe_llm_connection(db, settings)
