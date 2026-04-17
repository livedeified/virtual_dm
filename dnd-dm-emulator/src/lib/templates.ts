export const WORLD_STATE_TEMPLATE = `# World State Manifest

*This document acts as the persistent memory of the living world. It is updated after every significant interaction.*

## ⏳ Temporal Tracking

*The New Year begins on the First Day of Spring.*

- **Current Date:** YYYY-MM-DD *(ISO 8601)*
- **Time of Day:** [e.g., Early Morning, High Sun, Dusk, Midnight]
- **Season:** [Spring / Summer / Autumn / Winter]
- **Moon Phase:** [e.g., New Moon, Waxing Crescent, Full Moon]
- **Tides & Weather:** [e.g., High Tide, Heavy Fog, Force 4 Winds]

---

## 📍 Current Status

- **Party Location:** [Current Region/City/Dungeon]
- **Current Objective:** [What is the party actively trying to accomplish right now?]
- **Immediate Tensions:** [e.g., The guards are on high alert, a storm is approaching]

---

## 🦋 The Butterfly Effect (World Changes)

*Log permanent changes to the world caused by the party or autonomous NPC actions.*

| Location / Entity | Previous State | Current State | Cause / Event |
| :--- | :--- | :--- | :--- |
| *Example: The Rusty Boar Tavern* | *Active* | *Destroyed (Under Repair)* | *Collateral damage from a rogue fireball.* |
| - | - | - | - |

---

## 🗺️ Regional Overview

*High-level status of the various regions the party has visited or heard about. For specific gossip, see \`rumors.md\`.*

### [Region Name]
- **Ruling Body:** [Who is in charge?]
- **General Mood:** [e.g., Tense, Celebratory, Rebellious]
- **Active Conflicts:** [e.g., Bandit raids on the western roads]

---

## ⚙️ Upcoming Events (Downtime/Background Processing)

*Autonomous goals and events advancing behind the scenes if the players do not intervene.*

- **[Event Name]:** [Description and expected timeline/trigger]`;

export const NPC_LEDGER_TEMPLATE = `# The Occupant Ledger (NPC Tracking)

*Track all recurring characters here. Disposition ratings modify DCs for Charisma-based checks.*

## 🌟 High-Impact NPCs

| Name & Location | Race/Class | Disposition (-5 to +5) | Quirk | Memory & Notes | Primary Directive (Autonomous Goal) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *Example: Kaelen the Blacksmith (Oakhaven)* | *Dwarf / Artificer* | *+1 (Friendly)* | *Obsessed with spicy garlic; sneezes when lying.* | *Remember the party paid double for the last repair. Noticed the rogue's hidden dagger.* | *Needs rare starmetal to forge a masterpiece; will hire mercenaries if players don't help by next month.* |
| - | - | - | - | - | - |

---

## 👥 Local Contacts & Minors

| Name & Location | Occupation | Disposition | Quirk | Memory / Relationship to Party |
| :--- | :--- | :--- | :--- | :--- |
| - | - | - | - | - |

---

## 💀 Deceased / Inactive NPCs

*Keep a record of those who have fallen, moved on, or been removed from the board. Their actions may still echo.*

- **[Name]**: [Reason for inactivity/death] - [Lingering effects or loose ends left behind]`;

export const COMBAT_TRACKER_TEMPLATE = `# Active Combat Tracker

**Encounter Status:** [Inactive]
**Current Round:** 0
**Current Turn:** N/A

---

## 🌍 Environmental Physics & Battlefield

*Describe the tactical elements of the battlefield that enemies and players can utilize.*

- **Lighting:** [e.g., Bright Light / Dim Light / Darkness]
- **Weather / Wind:** [e.g., Clear / Force 6+ winds (Disadvantage on ranged/flames)]
- **Terrain Features:**
  - *High Ground:* [Location/Description]
  - *Cover:* [Location/Description - e.g., Half-cover (+2 AC) behind crates]
- **Hazards & Interactions:** [e.g., Chokepoints, slick mud, explosive barrels]

---

## ⚔️ Initiative Order

*Creatures act with self-preservation. Enemies will retreat or surrender if outmatched unless mindless or cornered.*

| Init | Entity Name | HP (Cur/Max) | AC | Conditions / Effects | Resources (Ammo/Light) | Tactical Notes & Instincts |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| - | - | -/- | - | - | - | - |

---

## 📖 Combat Log

*Track significant actions, resource expenditures (like a torch burning out), and narrative moments.*

- **Round 1:**
  - *Awaiting Initiative...*`;

export const SESSION_LOG_TEMPLATE = `# Campaign Session Log

*Record the flow of the adventure here. Every entry should capture the narrative progression and conclude with a Closing Sync as per Operational Protocols.*

---

## Session [Number]: [Optional Title]
**Date:** YYYY-MM-DD
**In-Game Date:** [Reference world_state.md]

### Narrative Summary
*A brief, kinetic description of what happened this session. Use sensory details and vivid prose.*

[e.g., "The party breached the rusted iron gates of Fort Dawnguard, the stench of goblin filth heavy in the air. A brutal skirmish left the courtyard soaked in blood and the goblin vanguard scattered."]

### Key Events & Discoveries
- [Event 1, e.g., Discovered the hidden cache of silver weapons]
- [Event 2, e.g., Learned that the bandit king is allied with the local magistrate]

### Loot & Resources Gained/Lost
- **Gained:** [e.g., A silk pouch with 42 tarnished silver coins]
- **Lost/Expended:** [e.g., 3 days rations, 15 arrows, 2 torches]

---

### 🔄 Closing Sync (End of Session)

- **Current Status:** [e.g., The party is resting in the shattered courtyard of the fort, catching their breath as rain begins to fall.]
- **Artifacts Updated:** 
  - \`[ ]\` world_state.md 
  - \`[ ]\` npc_ledger.md 
  - \`[ ]\` combat_tracker.md
- **Next Actionable Step:** [e.g., Investigate the inner keep where the chieftain is rallying his remaining forces.]`;
