"""
app/api/routers/worlds.py
--------------------------
HTTP endpoints for world management.

All business logic is delegated to app.services.world_service.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.schemas import DeleteConfirmation, WorldCreate, WorldRead
from app.services import world_service

router = APIRouter()


@router.get("", response_model=list[WorldRead])
def list_worlds(db: Session = Depends(get_db)):
    """List all registered worlds, newest first."""
    return world_service.list_worlds(db)


@router.post("", response_model=WorldRead, status_code=201)
def create_world(world_data: WorldCreate, db: Session = Depends(get_db)):
    """Register a new world, rejecting duplicate names."""
    return world_service.create_world(db, world_data)


@router.delete("/{world_id}", response_model=DeleteConfirmation)
def delete_world(world_id: int, db: Session = Depends(get_db)):
    """Delete a world and cascade-remove its lore entries."""
    world_service.delete_world(db, world_id)
    return {"status": "success", "message": "World deleted successfully."}
