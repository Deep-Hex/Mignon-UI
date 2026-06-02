"""
app/api/routers/characters.py
------------------------------
HTTP endpoints for character card management.

All business logic is delegated to app.services.character_service.
"""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.schemas import CharacterCreate, CharacterRead, CharacterUpdate, DeleteConfirmation
from app.services import character_service

router = APIRouter()


@router.get("", response_model=list[CharacterRead])
def list_characters(db: Session = Depends(get_db)):
    """Retrieve all registered roleplay character cards, newest first."""
    return character_service.list_characters(db)


@router.post("", response_model=CharacterRead, status_code=201)
def create_character(data: CharacterCreate, db: Session = Depends(get_db)):
    """Create a new character card."""
    return character_service.create_character(db, data)


@router.put("/{char_id}", response_model=CharacterRead)
def update_character(char_id: int, data: CharacterUpdate, db: Session = Depends(get_db)):
    """Update an existing character card by ID."""
    return character_service.update_character(db, char_id, data)


@router.post("/import-tavern", response_model=CharacterRead, status_code=201)
async def import_tavern_card(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Parse a Tavern-format PNG card and import it as a new character."""
    return await character_service.import_tavern_card(db, file)


@router.delete("/{char_id}", response_model=DeleteConfirmation)
def delete_character(char_id: int, db: Session = Depends(get_db)):
    """Permanently delete a character card by ID."""
    character_service.delete_character(db, char_id)
    return {"message": "Character deleted successfully"}
