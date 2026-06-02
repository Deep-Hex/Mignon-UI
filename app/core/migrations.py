"""
app/core/migrations.py
----------------------
Inline SQLite schema migration helpers.

Each migration is idempotent — it inspects the live schema before altering it,
so re-running on an already-migrated database is always safe.
"""

from sqlalchemy import Engine, inspect, text


def run_migrations(engine: Engine) -> None:
    """
    Execute all pending schema migrations against the provided SQLAlchemy engine.

    Migrations are checked and applied in dependency order. Every migration is
    guard-checked (column/table existence) before execution, making this function
    fully idempotent.

    Args:
        engine: The bound SQLAlchemy engine pointed at the application database.
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    _migrate_lore_entries(engine, inspector, existing_tables)
    _migrate_characters(engine, inspector, existing_tables)
    _migrate_settings(engine, inspector, existing_tables)
    _migrate_ui_stickers(engine, inspector, existing_tables)
    _migrate_chat_sessions(engine, inspector, existing_tables)
    _migrate_indexes(engine)


# ── Individual migration helpers ───────────────────────────────────────────────

def _migrate_lore_entries(engine: Engine, inspector, existing_tables: list[str]) -> None:
    """Add world_id column to lore_entries if it does not already exist."""
    if "lore_entries" not in existing_tables:
        return
    columns = [c["name"] for c in inspector.get_columns("lore_entries")]
    if "world_id" in columns:
        return
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE lore_entries "
                "ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE"
            ))
        print("[DB] Migration applied: lore_entries.world_id")
    except Exception as exc:
        print(f"[DB] Migration warning (lore_entries.world_id): {exc}")


def _migrate_characters(engine: Engine, inspector, existing_tables: list[str]) -> None:
    """Add world_id and nsfw_inject columns to characters if they do not already exist."""
    if "characters" not in existing_tables:
        return
    columns = [c["name"] for c in inspector.get_columns("characters")]
    
    if "world_id" not in columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE characters "
                    "ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE SET NULL"
                ))
            print("[DB] Migration applied: characters.world_id")
        except Exception as exc:
            print(f"[DB] Migration warning (characters.world_id): {exc}")

    if "nsfw_inject" not in columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE characters "
                    "ADD COLUMN nsfw_inject BOOLEAN DEFAULT 0 NOT NULL"
                ))
            print("[DB] Migration applied: characters.nsfw_inject")
        except Exception as exc:
            print(f"[DB] Migration warning (characters.nsfw_inject): {exc}")


def _migrate_settings(engine: Engine, inspector, existing_tables: list[str]) -> None:
    """Add persona columns to settings if they do not already exist."""
    if "settings" not in existing_tables:
        return
    existing_cols = [c["name"] for c in inspector.get_columns("settings")]
    pending: list[tuple[str, str]] = [
        ("persona_name",         "ALTER TABLE settings ADD COLUMN persona_name TEXT DEFAULT 'User'"),
        ("persona_avatar",       "ALTER TABLE settings ADD COLUMN persona_avatar TEXT"),
        ("persona_description",  "ALTER TABLE settings ADD COLUMN persona_description TEXT"),
        ("persona_character_id", "ALTER TABLE settings ADD COLUMN persona_character_id INTEGER"),
        ("cloud_rate_limit",     "ALTER TABLE settings ADD COLUMN cloud_rate_limit INTEGER DEFAULT 15"),
    ]
    for col_name, sql in pending:
        if col_name in existing_cols:
            continue
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
            print(f"[DB] Migration applied: settings.{col_name}")
        except Exception as exc:
            print(f"[DB] Migration warning (settings.{col_name}): {exc}")

    # Clean up legacy 'znbang/bge:small-en-v1.5-q8_0' from settings table to enable seamless local fallbacks
    try:
        with engine.begin() as conn:
            cols = [c["name"] for c in inspector.get_columns("settings")]
            if "embedding_model" in cols:
                conn.execute(text(
                    "UPDATE settings SET embedding_model = '' WHERE embedding_model = 'znbang/bge:small-en-v1.5-q8_0'"
                ))
            conn.execute(text(
                "UPDATE settings SET selected_model = '' WHERE selected_model = 'znbang/bge:small-en-v1.5-q8_0'"
            ))
        print("[DB] Cleaned up legacy embedding and corrupted selected model configuration in settings.")
    except Exception as exc:
        print(f"[DB] Migration cleanup warning: {exc}")


def _migrate_ui_stickers(engine: Engine, inspector, existing_tables: list[str]) -> None:
    """Add target_selectors column to ui_stickers if it does not already exist."""
    if "ui_stickers" not in existing_tables:
        return
    columns = [c["name"] for c in inspector.get_columns("ui_stickers")]
    if "target_selectors" in columns:
        return
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE ui_stickers ADD COLUMN target_selectors TEXT"
            ))
        print("[DB] Migration applied: ui_stickers.target_selectors")
    except Exception as exc:
        print(f"[DB] Migration warning (ui_stickers.target_selectors): {exc}")


def _migrate_chat_sessions(engine: Engine, inspector, existing_tables: list[str]) -> None:
    """Add scene_state and description columns to chat_sessions table if they do not already exist."""
    if "chat_sessions" not in existing_tables:
        return
    columns = [c["name"] for c in inspector.get_columns("chat_sessions")]

    if "scene_state" not in columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE chat_sessions ADD COLUMN scene_state TEXT DEFAULT '{}'"
                ))
            print("[DB] Migration applied: chat_sessions.scene_state")
        except Exception as exc:
            print(f"[DB] Migration warning (chat_sessions.scene_state): {exc}")

    if "description" not in columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE chat_sessions ADD COLUMN description TEXT"
                ))
            print("[DB] Migration applied: chat_sessions.description")
        except Exception as exc:
            print(f"[DB] Migration warning (chat_sessions.description): {exc}")


def _migrate_indexes(engine: Engine) -> None:
    """Ensure all required indexes exist. Uses CREATE INDEX IF NOT EXISTS."""
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_characters_world_id ON characters(world_id)",
        "CREATE INDEX IF NOT EXISTS ix_room_members_room_id ON room_members(room_id)",
        "CREATE INDEX IF NOT EXISTS ix_room_members_character_id ON room_members(character_id)",
        "CREATE INDEX IF NOT EXISTS ix_messages_room_id ON messages(room_id)",
        "CREATE INDEX IF NOT EXISTS ix_messages_character_id ON messages(character_id)",
        "CREATE INDEX IF NOT EXISTS ix_lore_entries_world_id ON lore_entries(world_id)",
        "CREATE INDEX IF NOT EXISTS ix_lore_entries_is_active ON lore_entries(is_active)",
        "CREATE INDEX IF NOT EXISTS ix_chat_summaries_room_id ON chat_summaries(room_id)",
        # --- NEW OPTIMIZED COMPOUND AND UNIQUE INDEXES ---
        "CREATE INDEX IF NOT EXISTS ix_messages_room_id_id ON messages(room_id, id)",
        "CREATE INDEX IF NOT EXISTS ix_lore_entries_world_id_active ON lore_entries(world_id, is_active)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_room_members_room_character ON room_members(room_id, character_id)",
    ]
    try:
        with engine.begin() as conn:
            for sql in indexes:
                conn.execute(text(sql))
        print("[DB] Index migrations applied successfully.")
    except Exception as exc:
        print(f"[DB] Migration warning (indexes): {exc}")
