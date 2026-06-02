"""
app/services/room_service.py
-----------------------------
Business logic for chat room (ChatSession) CRUD operations,
including member management, greeting seeding, and LanceDB memory cleanup.
"""

import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.database import Character, ChatSession, ChatSummary, Message, RoomMember, Settings
from app.schemas.schemas import RoomCreate


def _serialize_room(db: Session, r: ChatSession, persona_id: int | None) -> dict:
    last_msg = db.query(Message).filter(Message.room_id == r.id).order_by(Message.id.desc()).first()

    cleaned_content = None
    if last_msg:
        import re
        content = last_msg.content or ""
        standardized = content.replace('“', '"').replace('”', '"')

        # 1. Try quotes-based roleplay style (extract text inside quotes)
        if '"' in standardized:
            quotes = re.findall(r'"([^"]+)"', standardized)
            if quotes:
                cleaned = " ".join(quotes).strip()
                cleaned = re.sub(r'\s+', ' ', cleaned)
                if cleaned:
                    cleaned_content = cleaned

        # 2. Try asterisk-based roleplay style (exclude text inside asterisks)
        if not cleaned_content and '*' in content:
            cleaned = re.sub(r'\*[^*]+\*', '', content)
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            if cleaned:
                cleaned_content = cleaned

        # 3. Fallback: clean all quotes/asterisks and show plain text
        if not cleaned_content:
            cleaned = content.replace('*', '').replace('"', '').replace('“', '').replace('”', '').strip()
            cleaned_content = re.sub(r'\s+', ' ', cleaned)

    return {
        "id": r.id,
        "name": r.name,
        "is_group": r.is_group,
        "description": r.description,
        "scene_state": r.scene_state,
        "created_at": r.created_at,
        "bots": [m.character for m in r.members if m.character is not None and m.character.id != persona_id],
        "last_message": {
            "content": cleaned_content,
            "sender_name": last_msg.sender_name,
            "sender_type": last_msg.sender_type,
        } if last_msg else None
    }


def list_rooms(db: Session) -> list[dict]:
    """
    Return all chat rooms enriched with their participant character lists,
    ordered by most recent message or creation time (latest first).

    Args:
        db: Active database session.

    Returns:
        List of room dicts with keys: id, name, is_group, created_at, bots, last_message.
    """
    settings = db.query(Settings).filter(Settings.id == 1).first()
    persona_id = settings.persona_character_id if settings else None

    rooms = db.query(ChatSession).options(
        selectinload(ChatSession.members).selectinload(RoomMember.character)
    ).all()

    def get_sort_key(room):
        import datetime
        last_msg = db.query(Message.id).filter(Message.room_id == room.id).order_by(Message.id.desc()).first()
        last_msg_id = last_msg[0] if last_msg else 0
        created_val = room.created_at if room.created_at else datetime.datetime.min
        return (last_msg_id, created_val)

    rooms.sort(key=get_sort_key, reverse=True)

    return [_serialize_room(db, r, persona_id) for r in rooms]


def create_room(db: Session, data: RoomCreate) -> dict:
    """
    Create a new chat room, add member characters, and seed greeting messages.

    Args:
        db:   Active database session.
        data: Validated room creation payload.

    Returns:
        Dict with keys: id, name, bots.

    Raises:
        HTTPException 400 if no valid character IDs were provided.
    """
    bots = db.query(Character).filter(Character.id.in_(data.character_ids)).all()
    if not bots:
        raise HTTPException(status_code=400, detail="No valid characters provided.")

    room_id = str(uuid.uuid4())
    room = ChatSession(id=room_id, name=data.name, is_group=data.is_group, description=data.description)
    db.add(room)

    for bot in bots:
        db.add(RoomMember(room_id=room_id, character_id=bot.id))

    db.commit()

    # Seed character greetings as the first messages in the room
    if not data.is_group:
        # In individual 1-on-1 chats, seed the character's static greeting as usual
        for bot in bots:
            if bot.greeting:
                db.add(Message(
                    room_id=room_id,
                    sender_type="character",
                    character_id=bot.id,
                    sender_name=bot.name,
                    content=bot.greeting,
                    swipes=[bot.greeting],
                ))
    else:
        # In group chats, we do not seed static individual greetings because they are written for 1-on-1 play.
        # Instead, the user starts the sandbox with a dynamic group opener.
        pass

    db.commit()
    return {"id": room_id, "name": room.name, "bots": bots}


def get_room_memories(db: Session, room_id: str) -> list[dict]:
    """
    Fetch all episodic memory summaries for a specific room, ordered oldest-first.

    Args:
        db:      Active database session.
        room_id: UUID string identifying the chat room.

    Returns:
        List of summary dicts.

    Raises:
        HTTPException 404 if the room does not exist.
    """
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    summaries = (
        db.query(ChatSummary)
        .filter(ChatSummary.room_id == room_id)
        .order_by(ChatSummary.id.asc())
        .all()
    )
    return [
        {
            "id": s.id,
            "summary_text": s.summary_text,
            "start_message_id": s.start_message_id,
            "end_message_id": s.end_message_id,
            "created_at": s.created_at,
        }
        for s in summaries
    ]


def delete_room(db: Session, room_id: str) -> None:
    """
    Delete a chat room and cascade-clean its linked LanceDB vector memories.

    Args:
        db:      Active database session.
        room_id: UUID string identifying the chat room.

    Raises:
        HTTPException 404 if the room does not exist.
    """
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Purge orphaned LanceDB memory vectors for this room
    try:
        from app.services.rag import rag_store
        table = rag_store.get_table()
        table.delete(f"type = 'memory' AND source_id = '{room_id}'")
    except Exception as exc:
        print(f"[Memory] Warning: Failed to clean up LanceDB memories for room {room_id}: {exc}")

    db.delete(room)
    db.commit()


def truncate_room_messages(db: Session, room_id: str, message_id: int) -> None:
    """
    Truncate conversation history by deleting all messages after the target message.
    Also deletes any episodic memory summaries generated for messages after this point.
    """
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    target_msg = db.query(Message).filter(Message.id == message_id, Message.room_id == room_id).first()
    if not target_msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # 1. Fetch and clean up episodic summaries that cover deleted messages
    orphaned_summaries = db.query(ChatSummary).filter(
        ChatSummary.room_id == room_id,
        ChatSummary.end_message_id > message_id
    ).all()

    if orphaned_summaries:
        summary_ids = [f"mem_{summ.id}" for summ in orphaned_summaries]
        try:
            from app.services.rag import rag_store
            table = rag_store.get_table()
            ids_str = ", ".join(f"'{sid}'" for sid in summary_ids)
            table.delete(f"id IN ({ids_str})")
            print(f"[Memory] Successfully purged orphaned memories: {summary_ids}")
        except Exception as exc:
            print(f"[Memory] Warning: Failed to clean up memories during truncation: {exc}")

        # Delete summaries from SQLite
        for summ in orphaned_summaries:
            db.delete(summ)

    # 2. Delete messages after the target message
    db.query(Message).filter(Message.room_id == room_id, Message.id > message_id).delete(synchronize_session=False)
    db.commit()


def branch_room(db: Session, room_id: str, message_id: int) -> dict:
    """
    Branch a chat room from a specific message ID into a brand new chat room.
    """
    orig_room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not orig_room:
        raise HTTPException(status_code=404, detail="Original room not found")

    target_msg = db.query(Message).filter(Message.id == message_id, Message.room_id == room_id).first()
    if not target_msg:
        raise HTTPException(status_code=404, detail="Message not found")

    branch_id = str(uuid.uuid4())
    branch_name = f"{orig_room.name} (Branch)"

    new_room = ChatSession(id=branch_id, name=branch_name, is_group=orig_room.is_group, description=orig_room.description)
    db.add(new_room)

    # Add members
    for member in orig_room.members:
        db.add(RoomMember(room_id=branch_id, character_id=member.character_id))

    db.commit()

    # Copy all messages up to and including the target_msg
    orig_messages = db.query(Message).filter(
        Message.room_id == room_id,
        Message.id <= message_id
    ).order_by(Message.id.asc()).all()

    msg_id_map = {}
    for msg in orig_messages:
        new_msg = Message(
            room_id=branch_id,
            sender_type=msg.sender_type,
            character_id=msg.character_id,
            sender_name=msg.sender_name,
            content=msg.content,
            _swipes=msg._swipes,
            active_swipe_index=msg.active_swipe_index
        )
        db.add(new_msg)
        db.flush()
        msg_id_map[msg.id] = new_msg.id

    db.commit()

    # Copy all episodic memory summaries up to and including the target_msg
    orig_summaries = db.query(ChatSummary).filter(
        ChatSummary.room_id == room_id,
        ChatSummary.end_message_id <= message_id
    ).order_by(ChatSummary.id.asc()).all()

    if orig_summaries:
        from app.services.rag import rag_store
        for summ in orig_summaries:
            new_start_id = msg_id_map.get(summ.start_message_id, 0)
            new_end_id = msg_id_map.get(summ.end_message_id, 0)

            new_summ = ChatSummary(
                room_id=branch_id,
                summary_text=summ.summary_text,
                start_message_id=new_start_id,
                end_message_id=new_end_id
            )
            db.add(new_summ)
            db.flush()

            # Index cloned summary in LanceDB for semantic RAG search in the branched room
            try:
                text_to_embed = f"[PAST EVENT EPISODE]: {new_summ.summary_text}"
                vector = rag_store.embed([text_to_embed])[0].tolist()

                record = {
                    "id": f"mem_{new_summ.id}",
                    "type": "memory",
                    "source_id": branch_id,
                    "title": f"Room Memory Episode {new_summ.id}",
                    "text": text_to_embed,
                    "vector": vector
                }

                table = rag_store.get_table()
                table.add([record])
            except Exception as ve:
                print(f"[RAG] Error indexing branched memory to LanceDB: {ve}")

        db.commit()

    # Refresh and load relationships exactly like list_rooms does
    db.expire_all()
    res_room = db.query(ChatSession).filter(ChatSession.id == branch_id).options(
        selectinload(ChatSession.members).selectinload(RoomMember.character)
    ).first()

    settings = db.query(Settings).filter(Settings.id == 1).first()
    persona_id = settings.persona_character_id if settings else None

    return _serialize_room(db, res_room, persona_id)


def add_room_member(db: Session, room_id: str, character_id: int) -> dict:
    """Add a character as a member of a chat room."""
    exists = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.character_id == character_id).first()
    if not exists:
        db.add(RoomMember(room_id=room_id, character_id=character_id))
        db.commit()

    db.expire_all()
    res_room = db.query(ChatSession).filter(ChatSession.id == room_id).first()

    settings = db.query(Settings).filter(Settings.id == 1).first()
    persona_id = settings.persona_character_id if settings else None

    # Dynamically update is_group based on bots count
    bots = [m.character for m in res_room.members if m.character is not None and m.character.id != persona_id]
    should_be_group = len(bots) > 1
    if res_room.is_group != should_be_group:
        res_room.is_group = should_be_group
        db.commit()
        db.expire_all()
        res_room = db.query(ChatSession).filter(ChatSession.id == room_id).first()

    return _serialize_room(db, res_room, persona_id)


def remove_room_member(db: Session, room_id: str, character_id: int) -> dict:
    """Remove a character from a chat room's active participant list."""
    member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.character_id == character_id).first()
    if member:
        db.delete(member)
        db.commit()

    db.expire_all()
    res_room = db.query(ChatSession).filter(ChatSession.id == room_id).first()

    settings = db.query(Settings).filter(Settings.id == 1).first()
    persona_id = settings.persona_character_id if settings else None

    # Dynamically update is_group based on bots count
    bots = [m.character for m in res_room.members if m.character is not None and m.character.id != persona_id]
    should_be_group = len(bots) > 1
    if res_room.is_group != should_be_group:
        res_room.is_group = should_be_group
        db.commit()
        db.expire_all()
        res_room = db.query(ChatSession).filter(ChatSession.id == room_id).first()

    return _serialize_room(db, res_room, persona_id)


async def get_next_speaker(db: Session, room_id: str, message_content: str, muted_ids: str, mode: str = "efficient") -> int | None:
    """
    Get the next speaker's character ID using the selected Turn-Taking selector mode.

    Args:
        db:              Active database session.
        room_id:         UUID string identifying the chat room.
        message_content: Optional prompt or user text.
        muted_ids:       Comma-separated string of muted character IDs.
        mode:            Selection mode ("efficient" or "cognitive").

    Returns:
        The selected character ID or None.
    """
    room = db.query(ChatSession).options(
        selectinload(ChatSession.members).selectinload(RoomMember.character)
    ).filter(ChatSession.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    settings = db.query(Settings).filter(Settings.id == 1).first()
    persona_id = settings.persona_character_id if settings else None

    bots = [
        m.character for m in room.members
        if m.character is not None and m.character.id != persona_id
    ]

    # Parse muted character IDs
    muted_set = set()
    if muted_ids:
        for val in muted_ids.split(","):
            val_cleaned = val.strip()
            if val_cleaned.isdigit():
                muted_set.add(int(val_cleaned))

    eligible_bots = [b for b in bots if b.id not in muted_set]

    # Fetch room messages
    messages = db.query(Message).filter(Message.room_id == room_id).order_by(Message.id.asc()).all()

    # ── User Floor Hunger Check ──────────────────────────────────────────
    # If the bots have spoken 3 or more times consecutively without the user,
    # yield the floor to the user by returning None. This gives the user space to talk.
    last_user_idx = None
    for idx, m in enumerate(messages):
        if m.sender_type == 'user':
            last_user_idx = idx

    bot_consecutive_replies = len(messages)
    if last_user_idx is not None:
        bot_consecutive_replies = (len(messages) - 1) - last_user_idx

    if bot_consecutive_replies >= 3:
        print(f"[TurnTaking] Yielding floor to User (consecutive bot turns: {bot_consecutive_replies}). Halting chain.")
        return None

    if mode == "cognitive":
        from app.services.scene_service import run_cognitive_auction
        return await run_cognitive_auction(db, room_id, message_content, eligible_bots, messages)
    elif mode == "efficient":
        # Pure mathematical turn-taking without spatial/proximity or constraint checks
        from app.services.group_reply_order import run_ssjc_selector
        return run_ssjc_selector(message_content, eligible_bots, messages, scene_state=None)
    else:
        # "auto" or "hybrid": Upgraded mathematical selector with spatial/proximity and constraint checks
        scene_state_dict = {}
        if room.scene_state:
            try:
                import json
                scene_state_dict = json.loads(room.scene_state)
            except Exception:
                pass
        from app.services.group_reply_order import run_ssjc_selector
        return run_ssjc_selector(message_content, eligible_bots, messages, scene_state=scene_state_dict)

