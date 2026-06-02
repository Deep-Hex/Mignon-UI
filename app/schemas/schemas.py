"""
app/schemas/schemas.py
----------------------
Pydantic models for the AR Sandbox Roleplay API.

Organised into:
  - Request schemas  (Create / Update bodies)
  - Response schemas (Read models — returned from endpoints)
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ══════════════════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class SettingsUpdate(BaseModel):
    """Payload for updating global LLM provider and persona configuration."""

    provider: str = Field(..., description="AI engine provider: 'ollama', 'kobold', or 'openrouter'")
    openrouter_key: str | None = Field(None, description="Authorization API key for OpenRouter cloud engine")
    local_endpoint: str | None = Field(None, description="Local inference endpoint URL")
    selected_model: str | None = Field(None, description="Name/identifier of the selected model")
    temperature: float = Field(0.9, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(2048, ge=1, description="Maximum completion tokens per response")
    system_template: str = Field(..., description="Core roleplay system prompt template")
    persona_name: str | None = Field("User", description="Display name of the player in chat")
    persona_avatar: str | None = Field(None, description="Base64 avatar image for the player")
    persona_description: str | None = Field(None, description="Player backstory / personality")
    persona_character_id: int | None = Field(None, description="Use this character card as the player persona")
    cloud_rate_limit: int | None = Field(15, ge=0, description="Cloud API rate limit per minute (0 = unlimited)")


class CharacterCreate(BaseModel):
    """Payload for creating a new character card."""

    world_id: int | None = Field(None, description="Associate character with a world")
    name: str = Field(..., min_length=1, description="Character name")
    avatar: str | None = Field(None, description="Base64 PNG or static link for the character avatar")
    greeting: str | None = Field(None, description="Opening line spoken when entering a room")
    personality: str | None = Field(None, description="Character persona description")
    scenario: str | None = Field(None, description="Roleplay scenario/context")
    example_dialogue: str | None = Field(None, description="Few-shot example dialogues")
    nsfw_inject: bool | None = Field(False, description="Whether to inject NSFW directives into model prompts")


class CharacterUpdate(BaseModel):
    """Payload for updating an existing character card."""

    world_id: int | None = Field(None, description="Associate character with a world")
    name: str = Field(..., min_length=1, description="Character name")
    avatar: str | None = Field(None, description="Base64 PNG or static link for the character avatar")
    greeting: str | None = Field(None, description="Opening line spoken when entering a room")
    personality: str | None = Field(None, description="Character persona description")
    scenario: str | None = Field(None, description="Roleplay scenario/context")
    example_dialogue: str | None = Field(None, description="Few-shot example dialogues")
    nsfw_inject: bool | None = Field(False, description="Whether to inject NSFW directives into model prompts")


class RoomCreate(BaseModel):
    """Payload for creating a new chat room."""

    name: str = Field(..., min_length=1, description="Display name of the chat room")
    is_group: bool = Field(False, description="True if the room hosts multiple characters")
    character_ids: list[int] = Field(..., min_length=1, description="Characters participating in the room")
    description: str | None = Field(None, description="Custom scenario setup for this room")


class LoreEntryCreate(BaseModel):
    """Payload for creating a new lore entry."""

    world_id: int | None = Field(None, description="World this lore entry belongs to")
    title: str = Field(..., min_length=1, description="Lore entry title")
    keys: str = Field(..., description="Comma-separated trigger keywords")
    content: str = Field(..., min_length=1, description="Lore content injected into prompts on trigger")
    is_active: bool | None = Field(True, description="Whether this lore entry is active")
    weight: int | None = Field(100, description="Sorting priority weight")


class LoreEntryUpdate(BaseModel):
    """Payload for updating an existing lore entry."""

    world_id: int | None = Field(None, description="World this lore entry belongs to")
    title: str = Field(..., min_length=1, description="Lore entry title")
    keys: str = Field(..., description="Comma-separated trigger keywords")
    content: str = Field(..., min_length=1, description="Lore content injected into prompts on trigger")
    is_active: bool | None = Field(True, description="Whether this lore entry is active")
    weight: int | None = Field(100, description="Sorting priority weight")


class StickerCreate(BaseModel):
    """Payload for creating a new UI sticker."""

    image_data: str = Field(..., description="Base64 encoded image data")
    x: float = Field(100.0, description="Horizontal pixel position")
    y: float = Field(100.0, description="Vertical pixel position")
    scale: float = Field(1.0, description="Scale multiplier")
    rotation: int = Field(0, description="Rotation angle in degrees")
    opacity: float = Field(0.8, description="Opacity level")
    target_selectors: str | None = Field(None, description="Comma-separated CSS selectors to bind visibility")


class StickerUpdate(BaseModel):
    """Payload for partially updating a UI sticker's transform properties."""

    x: float | None = None
    y: float | None = None
    scale: float | None = None
    rotation: int | None = None
    opacity: float | None = None
    target_selectors: str | None = None


class WorldCreate(BaseModel):
    """Payload for creating a new world."""

    name: str = Field(..., min_length=1, description="Unique world name")
    description: str | None = Field(None, description="World atmosphere, premise, and rules")


# ══════════════════════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class SettingsRead(BaseModel):
    """Response model for the global application settings."""

    id: int
    provider: str
    openrouter_key: str | None
    local_endpoint: str | None
    selected_model: str | None
    temperature: float
    max_tokens: int
    system_template: str | None
    persona_name: str | None
    persona_avatar: str | None
    persona_description: str | None
    persona_character_id: int | None
    cloud_rate_limit: int | None

    model_config = {"from_attributes": True}


class CharacterRead(BaseModel):
    """Response model for a character card."""

    id: int
    world_id: int | None
    name: str
    avatar: str | None
    greeting: str | None
    personality: str | None
    scenario: str | None
    example_dialogue: str | None
    nsfw_inject: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class RoomBotRead(BaseModel):
    """Slim character representation used inside room listings."""

    id: int
    name: str
    avatar: str | None

    model_config = {"from_attributes": True}


class RoomRead(BaseModel):
    """Response model for a chat room with its participant list."""

    id: str
    name: str
    is_group: bool
    description: str | None = None
    scene_state: str | None = "{}"
    created_at: datetime | None = None
    bots: list[Any] = []   # list of character dicts/objects

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    """Response model for a single chat message."""

    id: int
    sender_type: str
    character_id: int | None
    sender_name: str
    content: str
    swipes: list[str] = []
    active_swipe_index: int

    model_config = {"from_attributes": True}


class LoreEntryRead(BaseModel):
    """Response model for a lore entry."""

    id: int
    world_id: int | None
    title: str
    keys: str
    content: str
    is_active: bool
    weight: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class WorldRead(BaseModel):
    """Response model for a world."""

    id: int
    name: str
    description: str | None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ChatSummaryRead(BaseModel):
    """Response model for an episodic memory summary."""

    id: int
    room_id: str
    summary_text: str
    start_message_id: int
    end_message_id: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DeleteConfirmation(BaseModel):
    """Generic response for successful deletion operations."""

    message: str
