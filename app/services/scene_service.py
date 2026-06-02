"""
app/services/scene_service.py
------------------------------
Implements the "Intelligence Mode" (LLM-driven Collective Mind Bidding Auction)
and programmatic situational consciousness helpers.
"""

import contextlib
import json
import re

from sqlalchemy.orm import Session

from app.core.database import Character, ChatSession, Message, Settings
from app.services.llm_client import query_llm_non_stream

# No global active_motivations dictionary needed (motivations are stored in ChatSession.scene_state for process-safe persistence)


async def run_cognitive_auction(
    db: Session,
    room_id: str,
    message_content: str,
    eligible_bots: list[Character],
    messages: list[Message]
) -> int | None:
    """
    Run a single-call LLM Bidding Auction across all eligible characters.

    1. Compiles a private cognitive prompt.
    2. Calls the active local LLM synchronously for a strict JSON completion.
    3. Resolves the bids to select the speaker with the highest urgency.

    Returns:
        The character ID of the winning bidder, or None if a silence lapse occurs.
    """
    if not eligible_bots:
        return None
    if len(eligible_bots) == 1:
        return eligible_bots[0].id

    settings = db.query(Settings).filter(Settings.id == 1).first() or Settings(id=1)

    # 1. Compile candidate roster for prompt in XML
    roster_str = "<candidate_roster>\n"
    for bot in eligible_bots:
        roster_str += "  <character>\n"
        roster_str += f"    <id>{bot.id}</id>\n"
        roster_str += f"    <name>{bot.name}</name>\n"
        if bot.personality:
            roster_str += f"    <personality>{bot.personality[:300]}...</personality>\n"
        roster_str += "  </character>\n"
    roster_str += "</candidate_roster>"

    # 2. Compile recent chat history in XML
    history_lines = []
    # Take up to the last 6 messages
    for m in messages[-6:]:
        swipes_list = m.swipes
        m_content = swipes_list[m.active_swipe_index] if swipes_list else m.content
        history_lines.append(f"  <turn speaker=\"{m.sender_name}\">{m_content}</turn>")

    if message_content.strip():
        history_lines.append(f"  <turn speaker=\"User\">{message_content.strip()}</turn>")

    history_str = "<recent_conversation_history>\n" + "\n".join(history_lines) + "\n</recent_conversation_history>"

    # 3. Assemble Bidding Instructions
    system_prompt = (
        "You are acting as the Collective Mind Coordinator for a private multi-agent roleplay sandbox.\n"
        "Your task is to evaluate the conversation and decide how each character mentally reacts to the latest dialogue.\n"
        "You MUST evaluate every character individually and output a strict JSON block wrapped inside <bids_json>...</bids_json> XML tags.\n\n"
        "EVALUATION CRITERIA for each character:\n"
        "- wants_to_speak (boolean): True if the character feels emotionally, socially, or physically compelled to speak in response to the last turn.\n"
        "- urgency (integer, 0-10): How urgent is their desire to speak? E.g., 0-3 for passive listener, 4-7 for normal turn-taking interest, 8-10 for high emotional reaction, interruption, or immediate self-defense.\n"
        "- motivation (string): A short, raw, introspective description of why they chose to bid this way (e.g., 'Elyse is direct-addressed', 'Kaelen wants to guard Deepak').\n"
        "- intended_action (string): A physical action they are performing silently or alongside speaking (e.g., 'steps forward, alert', 'watches silently').\n\n"
        "OUTPUT FORMAT CONSTRAINTS:\n"
        "- You MUST enclose your JSON output strictly inside <bids_json> and </bids_json> tags. Example: <bids_json>{\"character_bids\": ...}</bids_json>\n"
        "- The JSON dictionary keys under 'character_bids' MUST be the exact numeric ID strings of the characters (e.g., \"1\", \"2\", NOT their names or hybrid strings).\n"
        "- Do not include markdown code blocks (like ```json) inside the tags. Just the raw, valid JSON.\n"
        "- Under no circumstances should you add explanation text or formatting outside the JSON, except the wrapping tags.\n\n"
        "FEW-SHOT EXAMPLE:\n"
        "Input Roster:\n"
        "<candidate_roster>\n"
        "  <character>\n"
        "    <id>1</id>\n"
        "    <name>Kaelen</name>\n"
        "    <personality>A protective, serious guard...</personality>\n"
        "  </character>\n"
        "  <character>\n"
        "    <id>2</id>\n"
        "    <name>Elyse</name>\n"
        "    <personality>A cheerful, extroverted sorceress...</personality>\n"
        "  </character>\n"
        "</candidate_roster>\n\n"
        "Input History:\n"
        "<recent_conversation_history>\n"
        "  <turn speaker=\"User\">Kaelen, can you help me with this?</turn>\n"
        "</recent_conversation_history>\n\n"
        "Output:\n"
        "<bids_json>\n"
        "{\n"
        "  \"character_bids\": {\n"
        "    \"1\": {\n"
        "      \"wants_to_speak\": true,\n"
        "      \"urgency\": 9,\n"
        "      \"motivation\": \"Directly addressed by User for help.\",\n"
        "      \"intended_action\": \"steps forward, hand resting on pommel\"\n"
        "    },\n"
        "    \"2\": {\n"
        "      \"wants_to_speak\": false,\n"
        "      \"urgency\": 2,\n"
        "      \"motivation\": \"Listening politely as Kaelen is addressed.\",\n"
        "      \"intended_action\": \"watches with amusement\"\n"
        "    }\n"
        "  }\n"
        "}\n"
        "</bids_json>"
    )

    user_prompt = (
        f"Please evaluate the active roster and recent history below, and return the bidding JSON wrapped in <bids_json> tags now.\n\n"
        f"--- ACTIVE CHARACTER ROSTER ---\n{roster_str}\n\n"
        f"--- RECENT CONVERSATION FLOW ---\n{history_str}\n"
    )

    print(f"[Intelligence] Running Collective Mind Bidding Auction for {len(eligible_bots)} characters...")
    llm_output = await query_llm_non_stream(settings, system_prompt, user_prompt, temperature=0.2, max_tokens=1024)
    print(f"[Intelligence] Raw LLM Auction response: {llm_output}")

    # 4. Clean & Parse JSON output
    cleaned_json = clean_llm_json(llm_output)

    # Establish a local fallback trigger
    def run_fallback() -> int | None:
        print("[Intelligence] Falling back to local Turn Eagerness Selector (SSJC)...")
        from app.services.group_reply_order import run_ssjc_selector
        room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
        scene_state_dict = {}
        if room and room.scene_state:
            with contextlib.suppress(Exception):
                scene_state_dict = json.loads(room.scene_state)
        fallback_winner_id = run_ssjc_selector(message_content, eligible_bots, messages, scene_state=scene_state_dict)
        if fallback_winner_id is not None:
            winner_bot = next((b for b in eligible_bots if b.id == fallback_winner_id), None)
            w_name = winner_bot.name if winner_bot else "Unknown"
            print(f"[Intelligence] Fallback awarded floor to: {w_name} (ID: {fallback_winner_id})")
            if room:
                try:
                    s_state = json.loads(room.scene_state) if room.scene_state else {}
                except Exception:
                    s_state = {}
                s_state["active_motivation"] = "Participating in active conversation turns (Fallback)."
                room.scene_state = json.dumps(s_state)
                db.commit()
        return fallback_winner_id

    if not cleaned_json:
        print("[Intelligence] Error: LLM returned an empty or invalid JSON response.")
        return run_fallback()

    try:
        data = json.loads(cleaned_json)
        bids = data.get("character_bids", {})

        # 5. Resolve Winner
        highest_score = -1
        winner_id = None

        for bot_id_str, bid in bids.items():
            # Standardize bot ID keys
            clean_id_str = "".join(filter(str.isdigit, bot_id_str))
            if not clean_id_str:
                continue
            bot_id = int(clean_id_str)

            # Find candidate bot
            candidate = next((b for b in eligible_bots if b.id == bot_id), None)
            if not candidate:
                continue

            wants_to_speak = bid.get("wants_to_speak", False)
            urgency = int(bid.get("urgency", 0))
            motivation = bid.get("motivation", "")
            action = bid.get("intended_action", "")

            print(
                f"[Intelligence] Bot: {candidate.name} | Speak: {wants_to_speak} | "
                f"Urgency: {urgency} | Motivation: {motivation} | Action: {action}"
            )

            if wants_to_speak and urgency > highest_score:
                highest_score = urgency
                winner_id = bot_id

        # Minimum urgency threshold to win the floor is 3
        if highest_score >= 3 and winner_id is not None:
            winning_bot = next(b for b in eligible_bots if b.id == winner_id)
            print(f"[Intelligence] Floor awarded to: {winning_bot.name} (Urgency: {highest_score})")

            # Find the winning bid's motivation in bids JSON
            winning_bid_data = bids.get(str(winner_id)) or bids.get(f"{winner_id} ({winning_bot.name})") or bids.get(winning_bot.name) or {}
            winning_motivation = winning_bid_data.get("motivation", "")
            if winning_motivation:
                room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
                if room:
                    try:
                        s_state = json.loads(room.scene_state) if room.scene_state else {}
                    except Exception:
                        s_state = {}
                    s_state["active_motivation"] = winning_motivation
                    room.scene_state = json.dumps(s_state)
                    db.commit()

            return winner_id

        print("[Intelligence] All character bids fell below Silence Threshold.")
        return run_fallback()

    except Exception as exc:
        print(f"[Intelligence] Failed to parse auction bids: {exc}")
        return run_fallback()


def clean_llm_json(text: str) -> str:
    """Helper to extract clean JSON from LLM text, supporting <bids_json> tags and markdown wrappers."""
    if not text:
        return ""

    # 1. Prioritize custom XML tag extraction
    tag_match = re.search(r"<bids_json>\s*([\s\S]*?)\s*</bids_json>", text, re.IGNORECASE)
    if tag_match:
        content = tag_match.group(1).strip()
        # Clean any accidental code block wraps inside the tag
        md_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content, re.IGNORECASE)
        if md_match:
            return md_match.group(1).strip()
        return content

    # 2. Fall back to markdown wrappers
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # 3. Fall back to locating first curly brace to last curly brace
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start:end+1].strip()

    return text.strip()


def extract_physical_action(reply_content: str) -> str:
    """
    Programmatically extract asterisk-wrapped physical action blocks from dialogue text.
    E.g. "*steps forward* 'Hello' *smiles*" -> "steps forward, smiles"
    """
    if not reply_content:
        return ""

    # Matches anything enclosed in single asterisks
    actions = re.findall(r"\*(.*?)\*", reply_content)
    if not actions:
        return ""

    cleaned_actions = []
    for act in actions:
        cleaned = act.strip().strip("*").strip()
        if cleaned:
            cleaned_actions.append(cleaned)

    return ", ".join(cleaned_actions)


def detect_location_change(action: str) -> str | None:
    """
    Parses a physical action block to detect if the character has moved to a new location.
    Matches standard roleplay movement verbs and returns the cleaned, capitalized destination.
    E.g. "walks to the dungeons" -> "Dungeons"
         "enters Kaelen's laboratory" -> "Kaelen's Laboratory"
         "reaches the castle gates slowly" -> "Castle Gates"
    """
    if not action:
        return None

    # Clean string and lowercase for matching
    action_clean = action.strip()

    # Upgraded regex patterns targeting movement verbs with optional transition words and destinations
    patterns = [
        # Verbs with optional intermediate words (excluding prepositions) + prepositions:
        # E.g. "guiding the way towards the kitchen", "pulling her to the kitchen", "walking slowly to the balcony", "going to the dining room"
        r"\b(?:walk(?:s|ing)?|mov(?:e|es|ing)?|go(?:es|ing)?|head(?:s|ing)?|run(?:s|ning)?|step(?:s|ping)?|leav(?:e|es|ing)?|return(?:s|ing)?|sneak(?:s|ing)?|slip(?:s|ing)?|lead(?:s|ing)?|guid(?:e|es|ing)?|follow(?:s|ing)?|pull(?:s|ing)?|drag(?:s|ged|ging)?)(?:\s+(?!to|into|for|at|inside|toward|towards)[a-zA-Z]+){0,2}\s+(?:to|into|for|at|inside|toward|towards)\s+(?:the\s+)?([A-Za-z0-9\s'_-]{2,30})",
        # Verbs without prepositions: E.g. "enters the kitchen" or "reaches the gates" (excluding hand gestures like "reaching out")
        r"\b(?:enter|reach)(?:s|es|ed|ing)?(?!\s+out\b)\s+(?:the\s+)?([A-Za-z0-9\s'_-]{2,30})"
    ]

    for pat in patterns:
        match = re.search(pat, action_clean, re.IGNORECASE)
        if match:
            dest = match.group(1).strip()
            # Clean up trailing actions/verbs/conjunctions and common roleplay adverbs
            stop_triggers = [
                r"\b(?:and|but|with|as|to|while|where|then|so|for|at|by|from|in|of|on|through|under|over)\b",
                r"\b(?:slowly|quickly|cautiously|quietly|stealthily|hesitantly|gently|silently|nervously|calmly|hurriedly|eagerly|sadly|happily|angrily|wearily|tiredly|scaredly|timidly|boldly)\b",
                r"[,.;!?]"
            ]
            for trigger in stop_triggers:
                dest = re.split(trigger, dest, flags=re.IGNORECASE)[0].strip()

            # Clean up residual quotes or whitespace
            dest = dest.strip().strip("'\"*").strip()

            # Basic validation of destination length
            if 2 <= len(dest) <= 30:
                # Capitalize each word nicely
                words = [w.capitalize() for w in dest.split()]
                return " ".join(words)

    return None


def detect_mood_change(text: str) -> str | None:
    """
    Parses dialogue/action text to programmatically detect a character's active mood.
    Returns the mood string ('happy', 'flustered', 'aroused', 'sad', 'angry',
    'teasing', 'proud', 'jealous', 'surprised', 'sleepy') or None.
    """
    if not text:
        return None
    text_lower = text.lower()

    # 1. Aroused
    aroused_triggers = ["aroused", "arousal", "pant", "heavy breath", "lustful", "moan", "orgasm", "breeding", "wet", "dripping"]
    if any(k in text_lower for k in aroused_triggers):
        return "aroused"

    # 2. Flustered / Embarrassed
    flustered_triggers = ["blush", "blushing", "flustered", "pink cheeks", "red cheeks", "embarrassed", "timidly", "shyly", "fidget", "giggle nervously", "goes red"]
    if any(k in text_lower for k in flustered_triggers):
        return "flustered"

    # 3. Teasing / Mischievous
    teasing_triggers = ["teas", "smirk", "wink", "playful", "mischievous", "chuckle", "mocking", "tongue out", "jest"]
    if any(k in text_lower for k in teasing_triggers):
        return "teasing"

    # 4. Proud / Smug
    proud_triggers = ["proud", "pride", "smug", "triumphant", "boast", "arrogant", "gloat", "haught"]
    if any(k in text_lower for k in proud_triggers):
        return "proud"

    # 5. Jealous / Envious
    jealous_triggers = ["jealous", "envy", "envious", "pout", "possessiv", "covet"]
    if any(k in text_lower for k in jealous_triggers):
        return "jealous"

    # 6. Surprised / Shocked
    surprised_triggers = ["surprise", "shock", "gasp", "startle", "wide-eyed", "wide eyes", "widen", "astound", "astonish", "bewilder"]
    if any(k in text_lower for k in surprised_triggers):
        return "surprised"

    # 7. Sleepy / Tired
    sleepy_triggers = ["yawn", "sleepy", "tired", "exhausted", "drowsy", "rub eyes", "rubbing eyes", "nod off", "nodding off", "heavy eyelids", "fatigue"]
    if any(k in text_lower for k in sleepy_triggers):
        return "sleepy"

    # 8. Happy / Warm
    happy_triggers = ["smile", "giggle", "laugh", "grin", "cheerful", "happy", "contented", "delighted", "gently stroke"]
    if any(k in text_lower for k in happy_triggers):
        return "happy"

    # 9. Angry / Annoyed
    angry_triggers = ["scowl", "glare", "frown", "angry", "annoyed", "irritated", "growl", "hiss", "grumble"]
    if any(k in text_lower for k in angry_triggers):
        return "angry"

    # 10. Sad
    sad_triggers = ["sigh", "cry", "whimper", "sad", "tear", "gloomy", "depressed", "weep", "sniffle"]
    if any(k in text_lower for k in sad_triggers):
        return "sad"

    return None


def update_hybrid_scene_state(db: Session, room_id: str, character_id: int, character_name: str, reply_content: str) -> None:
    """
    Programmatic action and location updater for Hybrid Mode.
    Parses and updates the SQLite ChatSession scene board status matrix.
    """
    room = db.query(ChatSession).filter(ChatSession.id == room_id).first()
    if not room:
        return

    action = extract_physical_action(reply_content)

    try:
        state_dict = json.loads(room.scene_state) if room.scene_state else {}
    except Exception:
        state_dict = {}

    char_key = str(character_id)
    if char_key not in state_dict:
        state_dict[char_key] = {
            "name": character_name,
            "location": "Main Room",
            "action": "",
            "mood": "neutral"
        }

    if action:
        state_dict[char_key]["action"] = action

        # Automatically detect and update physical location transitions
        new_loc = detect_location_change(action)
        if new_loc:
            action_lower = action.lower()
            # Detect collective movement keywords (e.g. "let's go", "lets walk", "we head", "we'll", "everyone", "all ")
            is_collective = any(term in action_lower for term in ["let's", "lets", "we ", "we'll", "everyone", "all "])

            if is_collective:
                print(f"[Scene State] Collective movement detected! Moving everyone in room to: {new_loc}")
                for k in state_dict:
                    if k != "environment":
                        state_dict[k]["location"] = new_loc
            else:
                print(f"[Scene State] Character '{character_name}' automatically moved to: {new_loc}")
                state_dict[char_key]["location"] = new_loc

    # Programmatically detect and update emotional mood transitions
    new_mood = detect_mood_change(reply_content)
    if new_mood:
        print(f"[Scene State] Character '{character_name}' mood automatically updated to: {new_mood}")
        state_dict[char_key]["mood"] = new_mood

    room.scene_state = json.dumps(state_dict)
    db.commit()


