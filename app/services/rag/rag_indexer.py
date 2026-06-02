# rag_indexer.py
# Incremental indexer: syncs SQLite lore + character data → LanceDB.
# Uses content hashing (SHA-256) as the stable document ID so unchanged entries
# are never re-embedded (follows incremental-indexing.md pattern).

import hashlib

from sqlalchemy.orm import Session

from app.core.database import Character, LoreEntry
from app.services.rag import rag_store


def _content_hash(text: str) -> str:
    """SHA-256 of the text → stable, deterministic document ID."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


def _existing_ids(table) -> set[str]:
    """Return the set of document IDs currently in LanceDB."""
    try:
        df = table.search().select(["id"]).to_pandas()
        if "id" in df.columns:
            return set(df["id"].tolist())
        return set()
    except Exception:
        try:
            return set(table.to_pandas()["id"].tolist())
        except Exception:
            return set()


def _split_into_children(entry: LoreEntry) -> list[str]:
    """
    Split the lore content into smaller child chunks.
    Prepend title + trigger keywords to each child chunk (contextual chunking)
    so the embedding captures topic context even when the paragraph is dense prose.
    """
    content = entry.content or ""
    # Split by double newlines (paragraphs)
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

    # If no paragraphs found, fallback to using the entire content
    if not paragraphs:
        paragraphs = [content]

    child_texts = []
    for p in paragraphs:
        child_texts.append(
            f"[LORE: {entry.title}]\n"
            f"Trigger keywords: {entry.keys}\n\n"
            f"{p}"
        )
    return child_texts


def _build_character_text(char: Character) -> str:
    """
    Embed a compact character summary that answers questions like
    'Who is Max?', 'What does Millie look like?', 'How does Holly behave?'
    """
    parts = [f"[CHARACTER: {char.name}]"]
    if char.personality:
        parts.append(char.personality)
    if char.scenario:
        parts.append(f"Scenario: {char.scenario}")
    if char.example_dialogue:
        parts.append(f"Example dialogue:\n{char.example_dialogue}")
    return "\n\n".join(parts)


def sync_rag_index(db: Session) -> dict:
    """
    Incrementally sync all active lore entries and characters into LanceDB.

    - New/changed entries  → embedded and upserted
    - Unchanged entries    → skipped (hash match)
    - Deleted entries      → removed from LanceDB

    Returns a dict with counts: {added, skipped, deleted}
    """
    table        = rag_store.get_table()
    existing_ids = _existing_ids(table)

    rows_to_add  : list[dict] = []
    current_ids  : set[str]   = set()

    # ── 1. Lore entries (Parent-Child Ingestion) ──────────────────────────────
    lore_entries = db.query(LoreEntry).filter(LoreEntry.is_active).all()
    for entry in lore_entries:
        child_texts = _split_into_children(entry)
        for i, child_text in enumerate(child_texts):
            doc_id = _content_hash(f"lore_{entry.id}_{i}_{child_text}")
            current_ids.add(doc_id)

            if doc_id not in existing_ids:
                rows_to_add.append({
                    "id":        doc_id,
                    "type":      "lore",
                    "source_id": str(entry.id),
                    "title":     entry.title,
                    "text":      child_text,
                    "vector":    None,  # filled after batch embed
                })

    # ── 2. Characters ─────────────────────────────────────────────────────────
    characters = db.query(Character).all()
    for char in characters:
        text = _build_character_text(char)
        doc_id = _content_hash(text)
        current_ids.add(doc_id)

        if doc_id not in existing_ids:
            rows_to_add.append({
                "id":        doc_id,
                "type":      "character",
                "source_id": str(char.id),
                "title":     char.name,
                "text":      text,
                "vector":    None,
            })

    # ── 3. Chat Memories (Episodic Summaries from SQLite) ─────────────────────
    from app.core.database import ChatSummary
    chat_summaries = db.query(ChatSummary).all()
    for summary in chat_summaries:
        doc_id = f"mem_{summary.id}"
        current_ids.add(doc_id)

        if doc_id not in existing_ids:
            text_to_embed = f"[PAST EVENT EPISODE]: {summary.summary_text}"
            rows_to_add.append({
                "id":        doc_id,
                "type":      "memory",
                "source_id": str(summary.room_id),
                "title":     f"Room Memory Episode {summary.id}",
                "text":      text_to_embed,
                "vector":    None,
            })

    # ── 4. Batch embed new docs ───────────────────────────────────────────────
    added = 0
    if rows_to_add:
        texts  = [r["text"] for r in rows_to_add]
        vecs   = rag_store.embed(texts)  # (N, 768) float32

        for row, vec in zip(rows_to_add, vecs, strict=False):
            row["vector"] = vec.tolist()

        table.add(rows_to_add)
        added = len(rows_to_add)
        print(f"[RAG] Added {added} new document(s) to LanceDB.")

    skipped = len(current_ids) - added

    # ── 4. Remove stale docs (deleted lore/characters) ───────────────────────
    stale_ids = existing_ids - current_ids
    deleted = 0
    if stale_ids:
        id_list = ", ".join(f"'{i}'" for i in stale_ids)
        table.delete(f"id IN ({id_list})")
        deleted = len(stale_ids)
        print(f"[RAG] Removed {deleted} stale document(s) from LanceDB.")

    return {"added": added, "skipped": skipped, "deleted": deleted}
