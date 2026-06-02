"""
app/services/group_reply_order.py
-----------------------------------
Implements the Sacks, Schegloff, and Jefferson (1974) Conversation Analysis Model
augmented with a Cognitive Turn Eagerness Scoring (TES) Heuristic.
This is the "Efficient Mode" selector.

Evaluates conversation history and room members to determine the next character speaker.
Runs fully locally with zero LLM overhead.
"""

import random
import re

from app.core.database import Character, Message


def escape_regex(string: str) -> str:
    """Escapes special regex characters."""
    return re.escape(string)


def get_resolved_content(msg: Message) -> str:
    """Helper to resolve the displayed content of a message from its swipes."""
    swipes = msg.swipes
    if swipes and 0 <= msg.active_swipe_index < len(swipes):
        return swipes[msg.active_swipe_index]
    return msg.content or ""


def run_ssjc_selector(
    message_content: str,
    bots: list[Character],
    messages: list[Message],
    scene_state: dict | None = None
) -> int | None:
    """
    Selects the next speaker character ID based on the Efficient Mode Turn-Taking Model.

    Args:
        message_content: Newly typed user message (if any).
        bots: List of active candidate Character models.
        messages: List of recent message history in the room.
        scene_state: Optional SQLite room Scene Board status matrix dict.

    Returns:
        The character ID selected to speak next, or None if a silence lapse occurs.
    """
    if not bots:
        return None
    if len(bots) == 1:
        return bots[0].id

    user_text = (message_content or "").strip()

    # 1. RULE 1: Direct Address Check (highest priority)
    if user_text:
        for bot in bots:
            bot_name = bot.name.lower()
            regex = re.compile(rf"\b{escape_regex(bot_name)}\b", re.IGNORECASE)
            if regex.search(user_text):
                print(f"[Efficient] Rule 1 Direct Address triggered for bot: {bot.name}")
                return bot.id

    # Also check if the last message in history directly addressed someone
    if messages:
        last_msg = messages[-1]
        last_content = get_resolved_content(last_msg).strip()
        if last_content:
            for bot in bots:
                # Bots don't address themselves
                if last_msg.sender_name != bot.name:
                    bot_name = bot.name.lower()
                    regex = re.compile(rf"\b{escape_regex(bot_name)}\b", re.IGNORECASE)
                    if regex.search(last_content):
                        print(f"[Efficient] Rule 1 Direct Address from last message triggered for bot: {bot.name}")
                        return bot.id

    # 2. RULE 2: Calculate Cognitive Turn Eagerness Scores (TES)
    last_msg = messages[-1] if messages else None
    last_speaker_id = last_msg.character_id if (last_msg and last_msg.sender_type == 'character') else None

    # Extract clean tokens of 3+ letters from the last message to count topic overlap
    last_message_content = get_resolved_content(last_msg) if last_msg else ""
    # Strip non-alphanumeric/spaces, convert to lowercase, and split
    clean_last_tokens = [
        t for t in re.sub(r"[^\w\s]", " ", last_message_content).lower().split()
        if len(t) >= 3
    ]

    proactive_keywords = {
        'extroverted', 'talkative', 'outgoing', 'loud', 'aggressive', 'bold',
        'bubbly', 'hyper', 'friendly', 'active', 'dominant', 'vocal', 'social'
    }
    passive_keywords = {
        'introverted', 'shy', 'quiet', 'silent', 'reclusive', 'passive',
        'timid', 'reserved', 'cautious', 'submissive', 'stoic'
    }
    rambling_keywords = {
        'eccentric', 'rambling', 'chaotic', 'obsessive', 'monologue', 'distracted', 'mad'
    }

    # Map each bot ID to the index of their most recent message
    last_spoken_index = {}
    for idx, m in enumerate(messages):
        if m.sender_type == 'character' and m.character_id:
            last_spoken_index[m.character_id] = idx

    scores = []
    for bot in bots:
        # Programmatic Physical Constraint Check (efficient, zero LLM overhead)
        if scene_state:
            bot_state = scene_state.get(str(bot.id))
            if bot_state:
                action = (bot_state.get("action") or "").lower()
                mood = (bot_state.get("mood") or "").lower()
                # If fainted, unconscious, sleeping, or locked out, skip speaker completely
                if any(w in action or w in mood for w in ["unconscious", "fainted", "asleep", "sleeping", "knocked out"]):
                    print(f"[Efficient] Bot: {bot.name} is physically incapacitated ({action or mood}). Skipping.")
                    continue

        personality_text = (bot.personality or "").lower()
        scenario_text = (bot.scenario or "").lower()
        profile_text = f"{personality_text} {scenario_text}"

        # A. Topic Relevance (R_i)
        overlap_count = 0
        if clean_last_tokens:
            unique_tokens = set(clean_last_tokens)
            for token in unique_tokens:
                if token in profile_text:
                    overlap_count += 1
        topic_relevance = min(overlap_count, 5) / 5.0

        # B. Proactivity Index (P_i)
        proactivity = 0.5
        has_proactive = any(w in profile_text for w in proactive_keywords)
        has_passive = any(w in profile_text for w in passive_keywords)
        if has_proactive and not has_passive:
            proactivity = 0.8
        elif has_passive and not has_proactive:
            proactivity = 0.2

        # C. Floor Hunger (H_i)
        floor_hunger = 1.0
        last_spoken_msg_idx = last_spoken_index.get(bot.id)
        if last_spoken_msg_idx is not None:
            distance = (len(messages) - 1) - last_spoken_msg_idx
            floor_hunger = min(distance / 10.0, 1.0)

        if proactivity <= 0.3:
            floor_hunger = min(floor_hunger, 0.15)

        # D. Floor Fatigue Penalty
        fatigue = 2.0 if (last_speaker_id and last_speaker_id == bot.id) else 0.0

        # E. Conversational Momentum (Rambling)
        is_rambler = any(w in profile_text for w in rambling_keywords)
        momentum = 1.0 if (is_rambler and last_speaker_id and last_speaker_id == bot.id) else 0.0

        # F. Spontaneity Noise (-0.05 to +0.05)
        noise = (random.random() * 0.1) - 0.05

        # G. Spatial Proximity Boost
        proximity_boost = 0.0
        if scene_state:
            bot_state = scene_state.get(str(bot.id))
            if bot_state:
                bot_location = (bot_state.get("location") or "").lower()
                if bot_location and bot_location != "main room":
                    last_text = (message_content or "").lower()
                    if messages:
                        last_text += " " + get_resolved_content(messages[-1]).lower()
                    if bot_location in last_text:
                        print(f"[Efficient] Bot: {bot.name} matches active location '{bot_location}'. Boosting proximity.")
                        proximity_boost = 2.0

        # Combine into Turn Eagerness Score (TES)
        score = (topic_relevance * 4.0) + (proactivity * 2.0) + (floor_hunger * 3.0) - fatigue + momentum + proximity_boost + noise

        print(
            f"[Efficient] Bot: {bot.name} | TopicRel: {topic_relevance:.2f} | "
            f"Proact: {proactivity} | Hunger: {floor_hunger:.2f} | "
            f"Fatigue: {fatigue} | ProximityBoost: {proximity_boost:.1f} | TES: {score:.3f}"
        )

        scores.append({"id": bot.id, "score": score, "name": bot.name})

    scores.sort(key=lambda x: x["score"], reverse=True)
    best_candidate = scores[0]

    if best_candidate["score"] < 1.2:
        print(f"[Efficient] Max score {best_candidate['score']:.3f} is below Silence Threshold (1.2). Lapse in conversation.")
        return None

    print(f"[Efficient] Selected next speaker: {best_candidate['name']} with score: {best_candidate['score']:.3f}")
    return best_candidate["id"]
