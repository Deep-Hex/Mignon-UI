"""
app/services/world_service.py
------------------------------
Business logic for world CRUD operations.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.database import World
from app.schemas.schemas import WorldCreate


def list_worlds(db: Session) -> list[World]:
    """
    Return all worlds ordered newest-first.

    Args:
        db: Active database session.

    Returns:
        List of World ORM objects.
    """
    return db.query(World).order_by(World.id.desc()).all()


def create_world(db: Session, data: WorldCreate) -> World:
    """
    Persist a new world, rejecting duplicate names.

    Args:
        db:   Active database session.
        data: Validated creation payload.

    Returns:
        The newly created World ORM object.

    Raises:
        HTTPException 400 if a world with the same name already exists.
    """
    if db.query(World).filter(World.name == data.name).first():
        raise HTTPException(status_code=400, detail="A world with this name already exists.")

    world = World(name=data.name, description=data.description)
    db.add(world)
    db.commit()
    db.refresh(world)
    return world


def delete_world(db: Session, world_id: int) -> None:
    """
    Delete a world and cascade removal of its lore entries.

    Args:
        db:       Active database session.
        world_id: ID of the world to delete.

    Raises:
        HTTPException 404 if the world does not exist.
    """
    world = db.query(World).filter(World.id == world_id).first()
    if not world:
        raise HTTPException(status_code=404, detail="World not found.")
    db.delete(world)
    db.commit()
