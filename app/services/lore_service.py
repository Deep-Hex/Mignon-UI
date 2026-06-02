"""
app/services/lore_service.py
-----------------------------
Business logic for lore entry CRUD operations.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.database import LoreEntry
from app.schemas.schemas import LoreEntryCreate, LoreEntryUpdate


def list_lore(db: Session) -> list[LoreEntry]:
    """
    Return all lore entries ordered newest-first.

    Args:
        db: Active database session.

    Returns:
        List of LoreEntry ORM objects.
    """
    return db.query(LoreEntry).order_by(LoreEntry.id.desc()).all()


def create_lore(db: Session, data: LoreEntryCreate) -> LoreEntry:
    """
    Persist a new lore entry to the database.

    Args:
        db:   Active database session.
        data: Validated creation payload.

    Returns:
        The newly created LoreEntry ORM object.
    """
    entry = LoreEntry(
        title=data.title,
        keys=data.keys,
        content=data.content,
        is_active=data.is_active if data.is_active is not None else True,
        weight=data.weight if data.weight is not None else 100,
        world_id=data.world_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_lore(db: Session, lore_id: int, data: LoreEntryUpdate) -> LoreEntry:
    """
    Update an existing lore entry by its primary key.

    Args:
        db:      Active database session.
        lore_id: ID of the lore entry to update.
        data:    Validated update payload.

    Returns:
        The updated LoreEntry ORM object.

    Raises:
        HTTPException 404 if the lore entry does not exist.
    """
    entry = db.query(LoreEntry).filter(LoreEntry.id == lore_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Lore entry not found")

    entry.title = data.title
    entry.keys = data.keys
    entry.content = data.content
    entry.is_active = data.is_active if data.is_active is not None else entry.is_active
    entry.weight = data.weight if data.weight is not None else entry.weight
    entry.world_id = data.world_id

    db.commit()
    db.refresh(entry)
    return entry


def delete_lore(db: Session, lore_id: int) -> None:
    """
    Delete a lore entry by its primary key.

    Args:
        db:      Active database session.
        lore_id: ID of the lore entry to delete.

    Raises:
        HTTPException 404 if the lore entry does not exist.
    """
    entry = db.query(LoreEntry).filter(LoreEntry.id == lore_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Lore entry not found")
    db.delete(entry)
    db.commit()
