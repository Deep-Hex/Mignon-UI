"""
app/services/generation_service.py
------------------------------------
LLM response generation pipeline extracted from the messages router.

Handles prompt compilation, SSE streaming to the client, persisting the
assistant message to SQLite, and triggering background episodic memory
summarization — all without HTTP-layer concerns.
"""

import asyncio
import json
import re
import threading
from collections.abc import AsyncGenerator

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import Character, ChatSession, Message, RoomMember, SessionLocal, Settings
from app.services.llm_client import stream_llm_response
from app.services.prompt_compiler import compile_system_prompt, format_chat_history


async def stream_generation(
    db: Session,
    room_id: str,
    character_id: int,
    background_tasks: BackgroundTasks = None,
    auto_chain: bool = False,
    muted_ids: str = "",
    mode: str = "auto",
) -> AsyncGenerator[str, None]:
    """
    Compile the prompt, stream LLM tokens to the client, then save the response.
    Supports auto-chaining multi-bot conversations on the backend with dynamic speaker selection.
    """
    # ── Validate room ────────────────────────────────────────────────────────
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        yield _sse_error("Room not found")
        return

    # Force auto-chaining off for non-group rooms
    if not room.is_group:
        auto_chain = False

    settings = db.query(Settings).filter(Settings.id == 1).first() or Settings(id=1)

    max_chain_length = 10
    chain_count = 0
    current_char_id = character_id

    # ── Resolve active room member candidates (excluding muted and persona) for joint auction ──
    members = db.query(RoomMember).filter(RoomMember.room_id == room_id).all()
    persona_id = settings.persona_character_id if settings else None

    # Parse muted character IDs
    muted_set = set()
    if muted_ids:
        for val in muted_ids.split(","):
            val_cleaned = val.strip()
            if val_cleaned.isdigit():
                muted_set.add(int(val_cleaned))

    candidates = [
        m.character for m in members
        if m.character is not None and m.character.id != persona_id and m.character.id not in muted_set
    ]

    while current_char_id is not None:
        target_bot = db.query(Character).filter(Character.id == current_char_id).first()
        if not target_bot and mode != "cognitive":
            yield _sse_error(f"Target character {current_char_id} not found in database")
            return

        # ── 1. Compile prompts asynchronously ──
        is_joint_mode = (mode == "cognitive" and len(candidates) > 1)

        if is_joint_mode:
            print(f"[Generation] Compiling Joint Multi-Agent Prompt for {len(candidates)} candidates...")
            from app.services.prompt_compiler import compile_joint_multi_agent_prompt
            system_prompt = await compile_joint_multi_agent_prompt(db, room_id, candidates, settings)
            # Use placeholder target_bot for formatting chat history structure
            placeholder_bot = target_bot or candidates[0]
            history_str = format_chat_history(db, room_id, placeholder_bot, settings)
        else:
            # Yield bot_start event immediately in single-character/fallback modes
            yield f"data: {json.dumps({'bot_start': {'character_id': target_bot.id, 'name': target_bot.name, 'avatar': target_bot.avatar}})}\n\n"
            system_prompt = await compile_system_prompt(db, room_id, target_bot, settings)
            history_str = format_chat_history(db, room_id, target_bot, settings)

        # ── 2. Stream tokens ──
        full_response_text = ""
        is_speaker_resolved = not is_joint_mode
        selected_char_id = current_char_id
        tag_buffer = ""
        tag_regex = re.compile(r"<selected_speaker\s+id=\"(\d+)\">([\s\S]*?)</selected_speaker>", re.IGNORECASE)

        try:
            async for chunk in stream_llm_response(settings, system_prompt, history_str):
                if not chunk.strip().startswith("data:"):
                    continue
                data_str = chunk.strip()[5:].strip()
                try:
                    data_json = json.loads(data_str)
                    if "text" in data_json:
                        token = data_json["text"]

                        if not is_speaker_resolved:
                            tag_buffer += token
                            # Scan buffer for speaker tag
                            match = tag_regex.search(tag_buffer)
                            if match:
                                selected_char_id = int(match.group(1))
                                print(f"[Dynamic Selection] LLM chose speaker ID: {selected_char_id}")

                                # Resolve chosen bot from SQLite
                                target_bot = db.query(Character).filter(Character.id == selected_char_id).first()
                                if not target_bot:
                                    target_bot = db.query(Character).filter(Character.id == current_char_id).first() or candidates[0]
                                    selected_char_id = target_bot.id

                                # 1. Yield bot_start event now!
                                yield f"data: {json.dumps({'bot_start': {'character_id': target_bot.id, 'name': target_bot.name, 'avatar': target_bot.avatar}})}\n\n"
                                is_speaker_resolved = True

                                # Extract dialogue trailing the XML tag
                                parts = tag_regex.split(tag_buffer)
                                token = parts[-1] if len(parts) > 0 else ""
                                tag_buffer = ""
                            else:
                                # Robust fallback: if LLM streams 90+ characters without tag, run local SSJC
                                if len(tag_buffer) >= 90:
                                    print("[Dynamic Selection] Warning: Selection tag missing. Triggering robust local SSJC fallback.")
                                    from app.services.room_service import get_next_speaker
                                    fallback_id = await get_next_speaker(db, room_id, "", muted_ids, mode="efficient")
                                    if fallback_id is not None:
                                        selected_char_id = fallback_id
                                    else:
                                        selected_char_id = current_char_id or candidates[0].id

                                    target_bot = db.query(Character).filter(Character.id == selected_char_id).first()
                                    yield f"data: {json.dumps({'bot_start': {'character_id': target_bot.id, 'name': target_bot.name, 'avatar': target_bot.avatar}})}\n\n"
                                    is_speaker_resolved = True

                                    # Strip tag leftovers out of streamed tokens
                                    clean_token = re.sub(r"<selected_speaker.*?>.*?</selected_speaker>|<selected_speaker.*", "", tag_buffer, flags=re.IGNORECASE)
                                    token = clean_token
                                    tag_buffer = ""
                                else:
                                    # Buffer continues
                                    continue

                        if is_speaker_resolved and token:
                            full_response_text += token
                            yield f"data: {json.dumps({'token': token})}\n\n"
                    elif "error" in data_json:
                        yield chunk
                        return
                except Exception as stream_exc:
                    print(f"[Dynamic Selection] Stream chunk parsing warning: {stream_exc}")

            # Ensure speaker got resolved even on empty streams
            if not is_speaker_resolved:
                target_bot = db.query(Character).filter(Character.id == current_char_id).first() or candidates[0]
                yield f"data: {json.dumps({'bot_start': {'character_id': target_bot.id, 'name': target_bot.name, 'avatar': target_bot.avatar}})}\n\n"
                selected_char_id = target_bot.id

            # ── Persist assistant message ─────────────────────────────────────
            if not full_response_text.strip():
                yield _sse_error(f"AI for {target_bot.name} generated an empty response.")
                return

            loop_db: Session = SessionLocal()
            try:
                msg = Message(
                    room_id=room_id,
                    sender_type="character",
                    character_id=target_bot.id,
                    sender_name=target_bot.name,
                    content=full_response_text,
                    swipes=[full_response_text],
                )
                loop_db.add(msg)
                loop_db.commit()

                # Programmatically extract physical actions and update SQLite scene matrix
                try:
                    from app.services.scene_service import update_hybrid_scene_state
                    update_hybrid_scene_state(loop_db, room_id, target_bot.id, target_bot.name, full_response_text)
                except Exception as ex_scene:
                    print(f"[Generation] Action state update warning: {ex_scene}")

                # Trigger background episodic memory summarization safely and cooperatively
                if background_tasks is not None:
                    background_tasks.add_task(run_summarizer_task, room_id)
                else:
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(run_summarizer_task(room_id))
                        print(f"[Generation] Scheduled cooperative memory summarizer task for room {room_id}")
                    except RuntimeError:
                        _schedule_memory_summary(room_id)

                yield f"data: {json.dumps({'done': True, 'message_id': msg.id})}\n\n"
            except Exception as exc:
                print(f"[Generation] Error saving message: {exc}")
                loop_db.rollback()
                yield _sse_error(f"Failed to save message: {exc}")
                return
            finally:
                loop_db.close()

        except Exception as exc:
            yield _sse_error(f"Generation failed for {target_bot.name}: {exc}")
            return

        # ── Chaining Logic ───────────────────────────────────────────────────
        if auto_chain:
            chain_count += 1
            if chain_count >= max_chain_length:
                print(f"[Generation] Safety limit hit: Cap of {max_chain_length} replies reached.")
                yield f"data: {json.dumps({'chain_done': True})}\n\n"
                break

            # Resolve next speaker using a fresh DB session
            loop_db = SessionLocal()
            next_char_id = None
            try:
                from app.services.room_service import get_next_speaker
                next_char_id = await get_next_speaker(loop_db, room_id, "", muted_ids, mode=mode)
            except Exception as e:
                print(f"[Generation] Failed to get next speaker: {e}")
            finally:
                loop_db.close()

            if next_char_id is not None:
                print(f"[Generation] Chaining next speaker {next_char_id} in 1.5s...")
                await asyncio.sleep(1.5)
                current_char_id = next_char_id
            else:
                print("[Generation] Silence threshold hit or no speaker. Halting chain.")
                yield f"data: {json.dumps({'chain_done': True})}\n\n"
                break
        else:
            break



async def stream_swipe_regeneration(
    db: Session,
    room_id: str,
    message_id: int,
) -> AsyncGenerator[str, None]:
    """
    Generate a new LLM response and APPEND it to an existing message's swipes list.

    Unlike stream_generation (which creates a new Message row), this function
    appends the new response to the target message's swipes JSON array and
    advances active_swipe_index to the new last entry. This enables the swipe
    arrows (◀ ▶) to cycle between all alternatives.

    Args:
        db:         Active database session for prompt compilation.
        room_id:    UUID of the target chat room.
        message_id: ID of the Message row to append a new swipe to.

    Yields:
        SSE-formatted data strings (same format as stream_generation).
    """
    # ── Validate ─────────────────────────────────────────────────────────────
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        yield _sse_error("Room not found")
        return

    msg = db.query(Message).filter(Message.id == message_id, Message.room_id == room_id).first()
    if not msg:
        yield _sse_error("Message not found")
        return

    if msg.sender_type != "character" or not msg.character_id:
        yield _sse_error("Can only swipe-regenerate character messages")
        return

    target_bot = db.query(Character).filter(Character.id == msg.character_id).first()
    if not target_bot:
        yield _sse_error("Character not found")
        return

    settings = db.query(Settings).filter(Settings.id == 1).first() or Settings(id=1)

    # ── Compile prompt WITHOUT the message being swiped so the LLM doesn't
    #    just copy the existing answer. We temporarily exclude the last message
    #    from history by truncating at message_id.
    system_prompt = await compile_system_prompt(db, room_id, target_bot, settings)
    history_str = format_chat_history(db, room_id, target_bot, settings, exclude_from=message_id)

    # ── Stream tokens ────────────────────────────────────────────────────────
    full_response_text = ""
    try:
        async for chunk in stream_llm_response(settings, system_prompt, history_str):
            if not chunk.strip().startswith("data:"):
                continue
            data_str = chunk.strip()[5:].strip()
            try:
                data_json = json.loads(data_str)
                if "text" in data_json:
                    token = data_json["text"]
                    full_response_text += token
                    yield f"data: {json.dumps({'token': token})}\n\n"
                elif "error" in data_json:
                    yield chunk
                    return
            except Exception:
                pass

        if not full_response_text.strip():
            yield _sse_error("AI generated an empty response.")
            return

        # ── Append swipe to the existing message ─────────────────────────────
        loop_db: Session = SessionLocal()
        try:
            target_msg = loop_db.query(Message).filter(Message.id == message_id).first()
            if target_msg:
                existing_swipes = target_msg.swipes or []
                new_swipes = existing_swipes + [full_response_text]
                target_msg.swipes = new_swipes
                target_msg.active_swipe_index = len(new_swipes) - 1
                target_msg.content = full_response_text
                loop_db.commit()

                # Programmatically update scene status matrix from the swiped response
                try:
                    from app.services.scene_service import update_hybrid_scene_state
                    update_hybrid_scene_state(loop_db, room_id, target_bot.id, target_bot.name, full_response_text)
                except Exception as ex_scene:
                    print(f"[SwipeRegen] Action state update warning: {ex_scene}")

                yield f"data: {json.dumps({'done': True, 'message_id': message_id, 'swipe_index': target_msg.active_swipe_index})}\n\n"
            else:
                yield _sse_error("Message disappeared during generation")
        except Exception as exc:
            print(f"[SwipeRegen] Error appending swipe: {exc}")
            loop_db.rollback()
            yield _sse_error(f"Failed to save swipe: {exc}")
        finally:
            loop_db.close()

    except Exception as exc:
        yield _sse_error(f"Swipe regeneration failed: {exc}")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sse_error(message: str) -> str:
    """Format an SSE error event string."""
    return f"data: {json.dumps({'error': message})}\n\n"


def _schedule_memory_summary(room_id: str) -> None:
    """
    Spawn a daemon thread to run the episodic memory summarization pipeline.

    Using a daemon thread ensures the background task does not prevent
    server shutdown if the main process exits.

    Args:
        room_id: UUID of the room to check for summarization.
    """
    def _run(r_id: str) -> None:
        from app.services.memory_summarizer import check_and_generate_summary

        bg_db: Session = SessionLocal()
        try:
            settings_record = bg_db.query(Settings).filter(Settings.id == 1).first()
            if settings_record:
                asyncio.run(check_and_generate_summary(bg_db, r_id, settings_record))
        except Exception as exc:
            print(f"[Memory] Background summarizer error: {exc}")
        finally:
            bg_db.close()

    threading.Thread(target=_run, args=(room_id,), daemon=True).start()


async def run_summarizer_task(room_id: str) -> None:
    """
    FastAPI Background Task to safely compile and index episodic memory summaries.

    Args:
        room_id: UUID of the room to process.
    """
    from app.services.memory_summarizer import check_and_generate_summary

    bg_db: Session = SessionLocal()
    try:
        settings_record = bg_db.query(Settings).filter(Settings.id == 1).first()
        if settings_record:
            await check_and_generate_summary(bg_db, room_id, settings_record)
    except Exception as exc:
        print(f"[Memory] Background task error: {exc}")
    finally:
        bg_db.close()

