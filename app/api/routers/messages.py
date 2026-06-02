"""
app/api/routers/messages.py
----------------------------
HTTP endpoints for chat message management and LLM response generation.

The streaming generation pipeline is fully delegated to
app.services.generation_service, keeping this router as a thin HTTP relay.
"""

import time
from collections import deque

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import ChatSession, Message, Settings, get_db
from app.schemas.schemas import DeleteConfirmation, MessageRead
from app.services import room_service
from app.services.generation_service import stream_generation, stream_swipe_regeneration
from app.services.prompt_compiler import _resolve_persona

router = APIRouter()

CLOUD_RATE_LIMITS: dict[str, deque[float]] = {}
LIMIT_WINDOW = 60.0  # seconds
MAX_REQUESTS = 15     # max requests per minute

def check_cloud_rate_limit(room_id: str, db: Session):
    """Enforce a sliding-window rate limit for cloud-based providers (like OpenRouter) to prevent bill shock."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if settings and settings.provider == "openrouter":
        limit = settings.cloud_rate_limit if settings.cloud_rate_limit is not None else 15
        if limit <= 0:
            return  # Unlimited!

        now = time.time()
        if room_id not in CLOUD_RATE_LIMITS:
            CLOUD_RATE_LIMITS[room_id] = deque()

        timestamps = CLOUD_RATE_LIMITS[room_id]

        while timestamps and now - timestamps[0] > LIMIT_WINDOW:
            timestamps.popleft()

        if len(timestamps) >= limit:
            wait_time = int(LIMIT_WINDOW - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for cloud API. Please wait {wait_time}s to avoid token burn and bill shock."
            )
        timestamps.append(now)


@router.post("/api/rooms/{room_id}/messages/{message_id}/truncate")
def truncate_room_messages(room_id: str, message_id: int, db: Session = Depends(get_db)):
    """Truncate the conversation at this message ID by deleting all subsequent messages."""
    room_service.truncate_room_messages(db, room_id, message_id)
    return {"message": "Chat truncated successfully"}


@router.get("/api/rooms/{room_id}/messages", response_model=list[MessageRead])
def get_room_messages(room_id: str, db: Session = Depends(get_db)):
    """Fetch all message history for a room, resolving active swipe indices."""
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    messages = db.query(Message).filter(Message.room_id == room_id).order_by(Message.id.asc()).all()
    return [
        {
            "id": m.id,
            "sender_type": m.sender_type,
            "character_id": m.character_id,
            "sender_name": m.sender_name,
            "content": m.swipes[m.active_swipe_index] if m.swipes else m.content,
            "swipes": m.swipes,
            "active_swipe_index": m.active_swipe_index,
        }
        for m in messages
    ]


@router.post("/api/rooms/{room_id}/messages")
def post_user_message(
    room_id: str,
    content: str = Form(...),
    sender_name: str = Form("User"),
    db: Session = Depends(get_db),
):
    """Post a user message to a room, resolving the persona name from settings."""
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    settings = db.query(Settings).filter(Settings.id == 1).first()
    if settings:
        resolved_name, _ = _resolve_persona(db, settings)
        sender_name = resolved_name

    msg = Message(
        room_id=room_id,
        sender_type="user",
        character_id=None,
        sender_name=sender_name,
        content=content,
        swipes=[content],
    )
    db.add(msg)
    db.commit()

    # Programmatically update User's Scene Status Board on asterisk-action posts
    try:
        from app.services.scene_service import update_hybrid_scene_state
        # For the user, we pass character_id = 0 as a special tracking key
        update_hybrid_scene_state(db, room_id, 0, sender_name, content)
    except Exception as ex_scene:
        print(f"[messages.py] User action state update warning: {ex_scene}")

    return {"id": msg.id, "sender_name": sender_name, "content": content}


@router.post("/api/rooms/{room_id}/messages/{message_id}/swipe")
def set_swipe_index(room_id: str, message_id: int, index: int, db: Session = Depends(get_db)):
    """Set the active swipe index on a character message to show an alternative response."""
    msg = db.query(Message).filter(Message.id == message_id, Message.room_id == room_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    swipes_list = msg.swipes
    if index < 0 or index >= len(swipes_list):
        raise HTTPException(status_code=400, detail="Invalid swipe index")

    msg.active_swipe_index = index
    msg.content = swipes_list[index]
    db.commit()
    return {"id": msg.id, "active_swipe_index": msg.active_swipe_index, "content": msg.content}


@router.post("/api/rooms/{room_id}/messages/{message_id}/swipe-regen")
async def swipe_regen(room_id: str, message_id: int, db: Session = Depends(get_db)):
    """
    Generate a new alternative response and append it to the message's swipes list.

    This lets the user accumulate alternatives and cycle between them using the
    swipe arrows (◀ ▶). The new response becomes the active swipe automatically.
    """
    check_cloud_rate_limit(room_id, db)
    return StreamingResponse(
        stream_swipe_regeneration(db, room_id, message_id),
        media_type="text/event-stream",
    )


@router.delete("/api/messages/{message_id}", response_model=DeleteConfirmation)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    """Delete a single message by ID."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg)
    db.commit()
    return {"message": "Message deleted successfully"}


@router.put("/api/messages/{message_id}")
def update_message(
    message_id: int,
    content: str = Form(...),
    db: Session = Depends(get_db)
):
    """Update a message's text content and its active swipe directly."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.content = content

    # Safely update swipes list to keep swipes synced
    if msg.swipes:
        swipes_list = list(msg.swipes)
        if 0 <= msg.active_swipe_index < len(swipes_list):
            swipes_list[msg.active_swipe_index] = content
            # Re-assign list to trigger SQLAlchemy modification tracking
            msg.swipes = swipes_list
        else:
            msg.swipes = [content]
            msg.active_swipe_index = 0
    else:
        msg.swipes = [content]
        msg.active_swipe_index = 0

    db.commit()
    return {"id": msg.id, "content": msg.content, "active_swipe_index": msg.active_swipe_index}


@router.post("/api/rooms/{room_id}/generate")
async def generate_response(
    room_id: str,
    character_id: int,
    background_tasks: BackgroundTasks,
    auto_chain: bool = False,
    muted_ids: str = "",
    mode: str = "auto",
    db: Session = Depends(get_db)
):
    """
    Stream an LLM-generated character response as Server-Sent Events.

    Delegates entirely to generation_service.stream_generation, which handles
    prompt compilation, token streaming, DB persistence, and memory scheduling.
    Supports auto-chaining multi-bot conversations on the backend.
    """
    check_cloud_rate_limit(room_id, db)
    return StreamingResponse(
        stream_generation(db, room_id, character_id, background_tasks, auto_chain, muted_ids, mode=mode),
        media_type="text/event-stream",
    )

