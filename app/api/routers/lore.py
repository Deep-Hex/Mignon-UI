"""
app/api/routers/lore.py
------------------------
HTTP endpoints for lore entry management.

All business logic is delegated to app.services.lore_service.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.schemas import (
    DeleteConfirmation,
    LoreEntryCreate,
    LoreEntryRead,
    LoreEntryUpdate,
)
from app.services import lore_service

router = APIRouter()


@router.get("", response_model=list[LoreEntryRead])
def list_lore(db: Session = Depends(get_db)):
    """List all lore entries, newest first."""
    return lore_service.list_lore(db)


@router.post("", response_model=LoreEntryRead, status_code=201)
def create_lore(data: LoreEntryCreate, db: Session = Depends(get_db)):
    """Create a new lore entry."""
    return lore_service.create_lore(db, data)


@router.put("/{lore_id}", response_model=LoreEntryRead)
def update_lore(lore_id: int, data: LoreEntryUpdate, db: Session = Depends(get_db)):
    """Update an existing lore entry by ID."""
    return lore_service.update_lore(db, lore_id, data)


@router.delete("/{lore_id}", response_model=DeleteConfirmation)
def delete_lore(lore_id: int, db: Session = Depends(get_db)):
    """Delete a lore entry by ID."""
    lore_service.delete_lore(db, lore_id)
    return {"message": "Lore entry deleted successfully"}
