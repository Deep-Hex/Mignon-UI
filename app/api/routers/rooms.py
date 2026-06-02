"""
app/api/routers/rooms.py
-------------------------
HTTP endpoints for chat room management and episodic memory retrieval.

All business logic is delegated to app.services.room_service.
"""

from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from app.core.database import ChatSession, get_db
from app.schemas.schemas import DeleteConfirmation, RoomCreate
from app.services import room_service

router = APIRouter()


@router.get("")
def list_rooms(db: Session = Depends(get_db)):
    """List all active chat rooms with their participant character lists."""
    return room_service.list_rooms(db)


@router.post("", status_code=201)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    """Create a new chat room, add members, and seed greeting messages."""
    return room_service.create_room(db, data)


@router.get("/{room_id}/memories")
def get_room_memories(room_id: str, db: Session = Depends(get_db)):
    """Fetch all episodic memory summaries for a specific chat room."""
    return room_service.get_room_memories(db, room_id)


@router.delete("/{room_id}", response_model=DeleteConfirmation)
def delete_room(room_id: str, db: Session = Depends(get_db)):
    """Delete a chat room and cascade-clean its vector memories."""
    room_service.delete_room(db, room_id)
    return {"message": "Room deleted successfully"}


@router.post("/{room_id}/messages/{message_id}/branch")
def branch_room(room_id: str, message_id: int, db: Session = Depends(get_db)):
    """Branch the chat room from a specific message ID into a brand new chat room."""
    return room_service.branch_room(db, room_id, message_id)


@router.post("/{room_id}/members/{character_id}")
def add_room_member(room_id: str, character_id: int, db: Session = Depends(get_db)):
    """Dynamically add a character to a room's active participant list."""
    return room_service.add_room_member(db, room_id, character_id)


@router.delete("/{room_id}/members/{character_id}")
def remove_room_member(room_id: str, character_id: int, db: Session = Depends(get_db)):
    """Dynamically remove a character from a room's active participant list."""
    return room_service.remove_room_member(db, room_id, character_id)


@router.post("/{room_id}/next-speaker")
async def get_next_speaker(
    room_id: str,
    message_content: str = Form(""),
    muted_ids: str = Form(""),
    mode: str = Form("auto"),
    db: Session = Depends(get_db)
):
    """Calculate the next speaker in the group chat room using the selected mode."""
    speaker_id = await room_service.get_next_speaker(db, room_id, message_content, muted_ids, mode)
    return {"next_speaker_id": speaker_id}


@router.post("/{room_id}/scene-state")
def update_scene_state(
    room_id: str,
    scene_state: str = Form(...),
    db: Session = Depends(get_db)
):
    """Manually overwrite the room's active Scene Board status matrix (God-Mode)."""
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")
    room.scene_state = scene_state
    db.commit()
    return {"message": "Scene state updated successfully", "scene_state": room.scene_state}

