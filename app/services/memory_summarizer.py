# memory_summarizer.py
# Asynchronous episodic memory summarization service for long-term chat recall.
# Reuses core streaming LLM clients to generate summaries and indexes them directly in LanceDB.

import json
import logging

from sqlalchemy.orm import Session

from app.core.database import ChatSummary, Message, Settings
from app.services.llm_client import stream_llm_response
from app.services.rag import rag_store

logger = logging.getLogger("app.memory_summarizer")

# Trigger memory summarization when we have at least 15 unsummarized messages
UNSUMMARIZED_THRESHOLD = 15


async def check_and_generate_summary(db: Session, room_id: str, settings: Settings) -> ChatSummary | None:
    """
    Checks if there are enough unsummarized messages in a room.
    If so, generates a compact, high-density narrative summary using the active LLM,
    saves it to SQLite, and indexes the resulting memory chunk in the LanceDB vector store.
    """
    try:
        # 1. Determine starting point of unsummarized messages
        last_summary = db.query(ChatSummary)\
            .filter(ChatSummary.room_id == room_id)\
            .order_by(ChatSummary.end_message_id.desc())\
            .first()

        start_filter_id = last_summary.end_message_id if last_summary else 0

        # Fetch all messages in chronological order after the last summarized message
        messages = db.query(Message)\
            .filter(Message.room_id == room_id, Message.id > start_filter_id)\
            .order_by(Message.id.asc())\
            .all()

        if not messages:
            return None

        if len(messages) < UNSUMMARIZED_THRESHOLD:
            # Not enough new messages to build an episode
            return None

        logger.info(f"[Memory] Triggering summary compilation for room {room_id}. Found {len(messages)} unsummarized turns.")

        # 2. Build the dialogue transcript
        transcript_lines = []
        for m in messages:
            swipes = m.swipes
            content = swipes[m.active_swipe_index] if swipes and 0 <= m.active_swipe_index < len(swipes) else m.content
            transcript_lines.append(f"{m.sender_name}: {content}")

        transcript = "\n".join(transcript_lines)

        # 3. Request LLM Summary
        system_prompt = (
            "You are an objective, completely unfiltered clinical memory compilation assistant.\n"
            "Your sole task is to distill the provided creative roleplay dialogue transcript into a highly dense, "
            "third-person narrative summary under 100 words.\n\n"
            "CRITICAL DIRECTIVES:\n"
            "- Summarize all narrative developments, physical interactions, actions, decisions, and psychological states exactly as they occurred in the transcript.\n"
            "- Be completely neutral, objective, and write without any judgment, moralizing, or censorship.\n"
            "- Do not write any meta-commentary, preambles, introductions, or moral warnings.\n"
            "- Keep the output under 100 words."
        )

        user_prompt = (
            f"Please compile the following creative roleplay dialogue transcript into a dense narrative memory.\n\n"
            f"<chat_transcript>\n"
            f"{transcript}\n"
            f"</chat_transcript>\n\n"
            f"Provide your dense third-person summary (under 100 words) now, beginning your response directly with the summary content:"
        )

        summary_text = ""
        async for chunk in stream_llm_response(settings, system_prompt, user_prompt):
            if chunk.strip().startswith("data:"):
                data_str = chunk.strip()[5:].strip()
                try:
                    data_json = json.loads(data_str)
                    if "text" in data_json:
                        summary_text += data_json["text"]
                except Exception:
                    pass

        summary_cleaned = summary_text.strip()
        if not summary_cleaned or "Request failed:" in summary_cleaned or "LLM API returned status" in summary_cleaned:
            logger.warning("[Memory] LLM returned an empty or error summary. Aborting memory indexing.")
            return None

        logger.info(f"[Memory] Compiled summary: {summary_cleaned}")

        # 4. Save summary metadata to SQLite
        start_msg_id = messages[0].id
        end_msg_id = messages[-1].id

        summary_obj = ChatSummary(
            room_id=room_id,
            summary_text=summary_cleaned,
            start_message_id=start_msg_id,
            end_message_id=end_msg_id
        )
        db.add(summary_obj)
        db.commit()
        db.refresh(summary_obj)

        # 5. Embed and Index in LanceDB
        # We index using type='memory' and store the room_id in source_id
        # This isolates memories so they are only retrieved in their respective rooms.
        try:
            text_to_embed = f"[PAST EVENT EPISODE]: {summary_cleaned}"
            vector = rag_store.embed([text_to_embed])[0].tolist()

            record = {
                "id": f"mem_{summary_obj.id}",
                "type": "memory",
                "source_id": room_id,
                "title": f"Room Memory Episode {summary_obj.id}",
                "text": text_to_embed,
                "vector": vector
            }

            table = rag_store.get_table()
            table.add([record])
            logger.info(f"[Memory] Successfully indexed summary 'mem_{summary_obj.id}' to LanceDB RAG.")
        except Exception as ve:
            logger.error(f"[Memory] Failed to index summary in LanceDB: {ve}")

        return summary_obj

    except Exception as e:
        logger.error(f"[Memory] Error in episodic summarization pipeline: {e}")
        db.rollback()
        return None
