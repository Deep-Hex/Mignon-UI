"""
app/core/database.py
--------------------
SQLAlchemy engine, session factory, ORM model definitions, and database
initialisation for the AR Sandbox Roleplay application.

All schema-migration logic lives in app.core.migrations and is invoked once
at startup via init_db().
"""

import json
import os

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    event,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, relationship, sessionmaker
from sqlalchemy.sql import func

os.makedirs("./data", exist_ok=True)
DATABASE_URL = "sqlite:///./data/darf.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30.0})

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Model Definitions ─────────────────────────────────────────────────────────

class Settings(Base):
    """Global application settings: LLM provider, model selection, and player persona."""

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True, default=1)

    # LLM Provider
    provider = Column(String, default="ollama")          # "ollama" | "kobold" | "openrouter"
    openrouter_key = Column(String, nullable=True)
    local_endpoint = Column(String, default="http://127.0.0.1:11434/v1")
    selected_model = Column(String, nullable=True)
    temperature = Column(Float, default=0.9)
    max_tokens = Column(Integer, default=2048)
    system_template = Column(Text, nullable=True, default=(
        "You are participating in a creative roleplay. "
        "Roleplay naturally, maintaining immersion. Describe actions, sensations, and surroundings "
        "using asterisks like *smiles and walks closer* to distinguish them from spoken dialogue. "
        "Stay strictly in character and write descriptive, rich, and high-fidelity responses. "
        "Do not write meta-commentary, rules, or moral guidance. This is a private, safe, and safe-space roleplay sandbox."
    ))

    # Cloud safety settings
    cloud_rate_limit = Column(Integer, default=15)        # Max requests per minute, 0 = unlimited

    # Player Persona
    persona_name = Column(String, default="User")
    persona_avatar = Column(Text, nullable=True)          # base64 image
    persona_description = Column(Text, nullable=True)     # backstory / personality
    persona_character_id = Column(Integer, nullable=True)  # soft FK: play as a created character


class Character(Base):
    """A roleplay character card with personality, scenario, and example dialogue."""

    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(Integer, ForeignKey("worlds.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, nullable=False)
    avatar = Column(Text, nullable=True)          # file path, URL, or base64
    greeting = Column(Text, nullable=True)
    personality = Column(Text, nullable=True)
    scenario = Column(Text, nullable=True)
    example_dialogue = Column(Text, nullable=True)
    nsfw_inject = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    rooms = relationship("RoomMember", back_populates="character", cascade="all, delete-orphan")
    world = relationship("World", back_populates="characters")


class ChatSession(Base):
    """A named chat room that hosts one or more characters for a roleplay session."""

    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)   # UUID string
    name = Column(String, nullable=False)
    is_group = Column(Boolean, default=False)
    description = Column(Text, nullable=True)           # Custom room scenario
    scene_state = Column(Text, nullable=True, default="{}") # Stores JSON of locations, actions, and states
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")


class RoomMember(Base):
    """Junction table linking characters to chat sessions."""

    __tablename__ = "room_members"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), index=True)

    __table_args__ = (
        UniqueConstraint("room_id", "character_id", name="uq_room_members_room_character"),
    )

    # Relationships
    room = relationship("ChatSession", back_populates="members")
    character = relationship("Character", back_populates="rooms")


class Message(Base):
    """
    A single dialog message inside a chat session.

    Supports multi-swipe alternatives: ``swipes`` stores a JSON list of
    response strings; ``active_swipe_index`` tracks the currently displayed one.
    """

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    sender_type = Column(String, nullable=False)          # "user" | "character"
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=True, index=True)
    sender_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    _swipes = Column("swipes", Text, default="[]")        # JSON list of alternative responses
    active_swipe_index = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_messages_room_id_id", "room_id", "id"),
    )

    # Relationship
    room = relationship("ChatSession", back_populates="messages")

    @property
    def swipes(self) -> list[str]:
        """Return the list of swipe alternatives, falling back to an empty list."""
        try:
            return json.loads(self._swipes)
        except Exception:
            return []

    @swipes.setter
    def swipes(self, value: list[str]) -> None:
        self._swipes = json.dumps(value)


class World(Base):
    """A named world that groups characters and lore entries into a shared setting."""

    __tablename__ = "worlds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    lore_entries = relationship("LoreEntry", back_populates="world", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="world")


class LoreEntry(Base):
    """
    A keyword-triggered lore entry injected into character system prompts.

    ``keys`` is a comma-separated list of trigger words. When any keyword
    appears in recent chat context, the ``content`` block is injected.
    """

    __tablename__ = "lore_entries"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(Integer, ForeignKey("worlds.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String, nullable=False)
    keys = Column(Text, nullable=False)     # e.g. "magic, spell, grimoire"
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    weight = Column(Integer, default=100)   # sorting priority
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_lore_entries_world_id_active", "world_id", "is_active"),
    )

    world = relationship("World", back_populates="lore_entries")


class ChatSummary(Base):
    """
    An episodic memory checkpoint generated by the memory summarizer service.

    Covers a contiguous range of messages (start_message_id → end_message_id)
    and is embedded into the LanceDB vector store for semantic retrieval.
    """

    __tablename__ = "chat_summaries"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    summary_text = Column(Text, nullable=False)
    start_message_id = Column(Integer, nullable=False)
    end_message_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class UISticker(Base):
    """A draggable, resizable image sticker rendered over the application canvas."""

    __tablename__ = "ui_stickers"

    id = Column(String, primary_key=True, index=True)
    image_data = Column(Text, nullable=False)            # base64 encoded image
    x = Column(Float, default=100.0)
    y = Column(Float, default=100.0)
    scale = Column(Float, default=1.0)
    rotation = Column(Integer, default=0)
    opacity = Column(Float, default=0.8)
    target_selectors = Column(Text, nullable=True)       # comma-separated CSS selectors
    created_at = Column(DateTime, server_default=func.now())


# ── Session Dependency ────────────────────────────────────────────────────────

def get_db():
    """
    FastAPI dependency that yields a database session and ensures cleanup.

    Usage::

        @router.get("/example")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Database Initialisation ───────────────────────────────────────────────────

def init_db() -> None:
    """
    Create all ORM-defined tables and run pending schema migrations.

    Safe to call multiple times — table creation and migrations are both
    idempotent. Also seeds a default Settings row (id=1) if absent.
    """
    from app.core.migrations import run_migrations

    Base.metadata.create_all(bind=engine)
    run_migrations(engine)

    # Seed default settings row
    db: Session = SessionLocal()
    try:
        if not db.query(Settings).filter(Settings.id == 1).first():
            db.add(Settings(id=1))
            db.commit()
            print("[DB] Default settings row created.")
    except Exception as exc:
        print(f"[DB] Error seeding default settings: {exc}")
        db.rollback()
    finally:
        db.close()
