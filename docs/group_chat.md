# 🎭 Lobbies & Cognitive Turn Allocation

Darf UI supports immersive sandbox rooms where multiple AI characters can interact dynamically with the player and with one another. To coordinate turns cleanly without expensive LLM overhead, Darf UI implements a custom turn-taking orchestrator inside [group_reply_order.py](../app/services/group_reply_order.py).

---

## 🗣️ Sociolinguistic Turn-Taking (CA Model)

In classic conversation analysis (Sacks, Schegloff, and Jefferson), dialogue flows smoothly via three core rules:
1. **Rule 1 (Direct Address)**: The current speaker explicitly selects the next speaker (e.g., *"What is your opinion on this, Alice?"*). Alice must take the floor.
2. **Rule 2 (Self-Selection)**: If no speaker is explicitly selected, other room members self-select based on proactivity, interest, and conversational drive.
3. **Rule 3 (Silence/Lapse)**: If no member self-selects, a conversation lapse occurs, prompting either a pause or the original speaker continuing.

Darf UI models this sociolinguistic structure with **zero VRAM overhead** using a hybrid keyword scanner and numerical scoring heuristic.

---

## 🧮 The Turn Eagerness Score (TES) Heuristics

When no direct address is detected, the platform computes a **Turn Eagerness Score (TES)** for each room member. The character with the highest score is selected to speak next.

The complete TES formula is calculated as follows:

$$TES = (4.0 \times R_i) + (2.0 \times P_i) + (3.0 \times H_i) - F_i + M_i + S_i + N_i$$

### Core Factors Breakdown:

#### 1. Topic Relevance ($R_i$)
Measures the character's semantic interest. The system extracts alphanumeric keywords of 3+ letters from the last message and matches them against the character's `personality` and `scenario` fields:

$$R_i = \frac{\min(\text{Keyword Overlaps}, 5)}{5.0}$$

#### 2. Proactivity Index ($P_i$)
Tracks conversational drive. The engine scans the character profile for proactive traits (e.g. *extroverted, talkative, chatty, assertive*) and passive traits (e.g. *shy, quiet, introverted, stoic*):
* **Proactive Traits**: $P_i = 0.8$
* **Passive Traits**: $P_i = 0.2$
* **Neutral / Mixed**: $P_i = 0.5$

#### 3. Floor Hunger ($H_i$)
Represents turn deprivation. Counts how many dialogue turns have elapsed since this specific character last spoke:

$$H_i = \min\left(\frac{\text{Turns Since Last Spoken}}{10.0}, 1.0\right)$$

> [!NOTE]
> Shy characters ($P_i \le 0.3$) have their floor hunger artificially capped at **0.15** to prevent passive characters from eventually dominating the chat simply because they haven't spoken in a while.

#### 4. Floor Fatigue Penalty ($F_i$)
Prevents a single character from highjacking the floor with consecutive monologues. If the character was the absolute last speaker in the transcript, they receive a heavy penalty:
* **Last Speaker**: $F_i = 2.0$
* **Others**: $F_i = 0.0$

#### 5. Rambling Momentum ($M_i$)
An exception for eccentric or chaotic characters. If the character's profile explicitly contains rambling keywords (e.g. *eccentric, chaotic, rambling, hyperactive*), they receive a momentum boost:
* **Is Last Speaker & Is Rambler**: $M_i = 1.0$
* **Others**: $M_i = 0.0$

#### 6. Spatial Proximity ($S_i$)
Provides situational awareness. If the character's current location on the Scene Board is explicitly mentioned in the recent chat exchange, they receive a substantial boost to speak up:
* **Location Mentioned**: $S_i = 2.0$
* **Others**: $S_i = 0.0$

#### 7. Spontaneity Noise ($N_i$)
A small random float introduced to add organic variety and prevent deterministic conversational cycles:

$$N_i \sim \text{Uniform}(-0.05, 0.05)$$

---

## 🛑 Conversation Lapses & Silence

To prevent characters from generating boring, repetitive filler dialogue when nothing interesting is occurring, the selector enforces a global **Lapse Threshold**:

```
Is Max(TES) across all members < 1.2?
  ├── Yes ──> Lapse Triggered: Nobody self-selects. Floor returns to the User.
  └── No  ──> Winner Selected: Character with highest TES executes prompt.
```

---

## 📋 Shared Environment Scene Status Board

All character interactions are contextualized on a shared **Scene Status Board** stored inside the room's `scene_state` column. This JSON dictionary tracks active locations, moods, actions, and motivations:

```json
{
  "environment": {
    "location": "The Whispering Tavern",
    "atmosphere": "Dimly lit, cozy, smelling of roasted barley and pine wood"
  },
  "2": {
    "name": "Evelyn",
    "location": "The Whispering Tavern",
    "action": "Leaning against the bar counter, sipping red wine",
    "mood": "contemplative"
  },
  "3": {
    "name": "Lilith",
    "location": "The Courtyard",
    "action": "Asleep on the wooden bench under the starry sky",
    "mood": "sleeping"
  },
  "active_motivation": "Evelyn wants to overhear the traveler's conversation"
}
```

### Physical Incapacitation Filters
Before computing the TES array, the orchestrator passes each room member through a **Physical Incapacitation Filter**:
* It checks the active `action` and `mood` strings of the member.
* If terms like *sleeping, unconscious, fainted, knocked out, or paralyzed* are detected, that character is **instantly skipped** and removed from the active speaker pool.
* In the JSON example above, **Lilith** is skipped because her mood is `"sleeping"`, leaving Evelyn to coordinate turns with the player.
