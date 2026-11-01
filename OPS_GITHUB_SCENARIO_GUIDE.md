# OPERATION PACIFIC SHIELD (OPS)
## Combined Scenario Guide for the Digital Training Game

> **Independent fictional adaptation — NOT an official OPORD, EXORD, or FRAGORD.**  
> **Status:** Design document; gameplay systems described here are planned unless implemented and tested.  
> **Use:** Public GitHub repository, training-game development, and beginner instruction.

## Purpose

This document brings the **three kinds of orders** into a single, beginner-friendly framework for an original digital OPS-inspired game. It intentionally **does not reproduce** the uploaded orders, OTS-only guidance, CUI-marked information, hidden Game Master rules, or protected spreadsheet data. The public game must use newly written fictional scenarios and values.

The goal is to make a hands-on, turn-based cooperative strategy game where a human player works at one workstation and other positions are filled by AI or real teammates.

## How the three orders fit together

| Order | Plain-English meaning | What the player sees in the game | What changes in the game |
|---|---|---|---|
| **OPORD — Operation Order** | The foundational plan: what is happening, what the mission is, who has responsibilities, and what success means | **Mission Briefing**: background, objectives, organizational roles, restrictions, and desired end state | Initializes the scenario, teams, starting game boards, and general constraints |
| **EXORD — Execution Order** | The instruction to begin doing the planned mission | **Execution Authorization**: the start of a specific exercise phase, assigned tasks, and available assets | Enables the authorized planning/commitment/execution cycle under the chosen fictional rules |
| **FRAGORD — Fragmentary Order** | A change or update to the existing plan | **Mission Update**: what changed, what remains unchanged, which tasks need reconsideration | Applies a versioned, clearly recorded change to scenario conditions, permissions, objectives, or available resources |

**Golden rule:** A FRAGORD changes only the things it explicitly updates; the rest of the underlying scenario remains in force. A player must be able to inspect the order history to distinguish the original plan from later instructions.

## Public fictional exercise narrative

A fictional multinational task force must improve the resilience of a chain of exercise support sites across a Pacific island region. Its goals are to maintain communications, establish support capacity, coordinate transportation, protect fictional personnel, and respond to changing conditions while preserving cooperation with partner communities.

The scenario takes place on an **original, fictionalized game map**. Base names, site capabilities, resource levels, political permissions, aircraft performance, outcomes, and all numerical rules are independently created for this game. Do not import the uploaded orders' operational details or protected workbook formulas into public game assets.

## Example combined mission sequence

### Phase 0 — OPORD: Mission assigned

**Player briefing:** "Your team has been directed to prepare and sustain designated exercise support sites. Your goal is to coordinate with other workstations, evaluate available information, manage limited fictional resources, and meet the specified end state."

**Tasks presented:**

- Learn your assigned role and what decisions you are authorized to make.
- Review the regional board and site cards.
- Identify the mission's success conditions and known limitations.
- Review pending requests and resource availability.
- Prepare a plan without committing resources you do not control.

**Software behavior:** Display the initial story and mission data; initialize teams, objectives, hidden exercise information, resources, and the turn controller. Display unresolved requirements instead of marking anything automatically complete.

### Phase 1 — EXORD: Begin execution planning

**Player briefing:** "The exercise has entered its active planning period. Complete your assigned preparations, coordinate any support you need, and submit valid actions before the simulated turn is resolved."

**Tasks presented:**

- Review your position-specific inbox.
- Select an eligible operating site or other assigned objective.
- Request available fictional information through the RFI interface.
- Review prerequisites and identify missing resources.
- Make coordination requests to AI or human teammates.
- Prepare and submit valid game actions for the next turn.

**Software behavior:** Enable permitted planning actions, route requests, validate resource assignments, and show pending submissions. No aircraft or resource transfer is treated as completed simply because a request was approved.

### Phase 2 — Execution and adjudication

**Player briefing:** "The current turn is being resolved. Watch the map and your workstation for approved movement, resource updates, event results, and decisions requiring action on the next turn."

**Software behavior:** The authoritative rules engine processes approved actions and scenario-defined random outcomes; updates board pieces and inventories; records an event log; animates resulting movements; prevents duplicated deliveries, impossible states, and double scoring.

### Phase 3 — FRAGORD: Conditions change

**Player briefing:** "A new mission update has changed one or more exercise conditions. Review the changes, understand which of your planned actions are affected, and adapt your next turn."

**Example fictional change:** A fictional receiving site's support capacity is temporarily reduced by severe weather. A planned delivery now requires additional coordination or a permitted alternate plan. This is **an original teaching example**, not a quotation from an uploaded order.

**Tasks presented:**

- Open the highlighted Mission Update.
- Compare **Before** and **After** conditions.
- See which objectives and submitted actions are affected.
- Coordinate with the authorized station to revise your plan.
- Submit corrected actions for the next permitted phase.

**Software behavior:** Apply only the explicitly defined scenario changes at their effective turn. Record who/what issued the fictional update, when it was received, its effective turn, and the version of the scenario. Leave all unrelated conditions unchanged.

### Phase 4 — Mission review

**Player briefing:** "Review the mission results. What did your station accomplish, what remains incomplete, and how did your coordination affect the team?"

**Software behavior:** Produce an After-Action Review from logged state transitions, not generic success text. Explain completed tasks, missed requirements, resource movements, information received, scenario changes, and lessons for another attempt.

## Play modes

### Solo — You plus AI personnel

Choose or receive a valid position. AI teammates operate other stations, answer relevant requests, send their own coordination messages, and act within the same rules. The AI may explain a decision but cannot fabricate a legal result, inventory, or completion. Unfilled positions must not stop the mission.

### Cooperative team — Real players plus AI for vacancies

Create a private room, invite classmates, assign roles, and use one shared server-controlled game state. Messages travel to the correct workstation. Turn transitions and resource allocations are synchronized. The host or authorized Game Master manages reassignment and disconnections; an AI can take over only through a controlled handoff.

### Guided learning — Optional plain-English help

Allow **Beginner**, **Guided**, **Independent**, and **Challenge** assistance levels. Each board has **Hint**, **Explain Simply**, **Show Me**, **Why can't I do this?**, and **Read Aloud** controls. Hints must reflect the player's permitted information and real current game state.

## Role-aware workstation concepts

- **MOB/FOS:** Select a fictional site, request information, review general support requirements, assign eligible resource counters, and report task status.
- **CAOC:** Review fictional support requests, resolve scenario-authorized allocation and approval decisions, and maintain a shared planning picture.
- **CSpOC:** Handle simulated space-support information requests and share permitted results with appropriate teams.
- **MEDCOM:** Track fictional patient-support and medical-capacity counters, coordinate approved assistance, and maintain consistent accountability.
- **Game Master:** Control scenario phase, information-release rules, adjudication, event timing, and audit history within configured permissions.

These are broad educational roles for the independent game. Exact OTS-specific procedures and hidden information must remain outside the public repository unless explicitly cleared for release.

## What makes the board truly interactive

A player must be able to select a location and receive a working panel showing current state and allowable actions. The following full gameplay loop must work:

1. Select an assigned objective on the hex board.
2. See the objective's current state, prerequisites, and permitted actions.
3. Request needed information or coordination.
4. Receive a role-appropriate response from a human or AI teammate.
5. Commit valid fictional resources under the current turn rules.
6. Watch the authoritative game engine adjudicate the turn.
7. See corresponding board and inventory updates.
8. Receive an order update or exercise event and adapt.
9. Complete the objective only after validation.
10. Review an accurate, personalized debrief.

A decorated button that does not update actual game state is not a completed feature.

## Data model for developers

Keep separate versioned objects for:

- `baseOrder`: scenario description, end state, role assignments, initial conditions.
- `executionOrders[]`: turn/phase activation and authorized new tasks.
- `fragmentaryOrders[]`: each change, its effective turn, and the specific fields it modifies.
- `sites[]`: fictional location and support-capability state.
- `objectives[]`: requirements, responsible role, dependencies, progress, and validation.
- `resources[]`: uniquely identified inventory, owner, location, reserved/committed/delivered state.
- `requests[]`: originator, recipient, subject, status, and response.
- `players[]`: human/AI control, role, permissions, and connectivity.
- `events[]`: turn, cause, recipients, state changes, and audit history.
- `turn`: planning, committed, adjudicating, resolved.

Use a **pure rules engine** for eligibility and adjudication, and a separate renderer for maps, cards, sound, and animation. Public multiplayer rooms require an authoritative backend; GitHub Pages alone does not run a multiplayer server.

## Acceptance tests before calling the game operational

- The game can start with one human and AI teammates.
- Two humans can join the same room from different browsers.
- The same committed resource cannot be allocated twice.
- A player cannot perform an action reserved for another station.
- An OPORD briefing appears first, the EXORD activates the appropriate fictional phase, and a FRAGORD changes only its stated conditions.
- An upcoming change does not apply before its effective turn.
- The user can compare the original plan and changed plan.
- A mission update never silently deletes previous orders or completed decisions.
- The objective and map panel react correctly to every valid action.
- Invalid actions are blocked with a useful explanation and an optional hint.
- Save/reload preserves orders, roles, resources, messages, and turn state without duplication.
- Solo and multiplayer both produce a debrief based on what actually happened.
- Disabled or unfinished features are identified honestly.

## Suggested public GitHub project layout

```text
OPS-GAME/
├── README.md
├── docs/
│   └── OPS_GITHUB_SCENARIO_GUIDE.md   <-- this document
├── src/
│   ├── data/fictionalScenario.json
│   ├── engine/orders.js
│   ├── engine/turns.js
│   ├── engine/rules.js
│   ├── engine/resources.js
│   ├── engine/requests.js
│   ├── ai/teammates.js
│   ├── multiplayer/roomClient.js
│   └── ui/orderBriefings.js
└── tests/
    ├── orders.test.js
    ├── fragoChanges.test.js
    └── gameplay.spec.js
```

## Handling source documents responsibly

The materials used as design references include a June 2026 OTS-only User Guide and supporting orders that carry CUI markings. **Do not upload those PDFs, their verbatim contents, hidden GM tables, or the practice spreadsheets to a public GitHub repository without official authorization and an appropriate release review.** Markings such as `UNCLASSIFIED` do not automatically mean a document is approved for public release.

If developing an authorized institutional edition, keep it separate from this independent public project and use only approved hosting, access controls, and source materials. This public guide is intentionally a **new fictional synthesis**, not an approved reproduction or replacement for the source orders.

---

**OPS Game Concept:** *Receive the mission → Understand the order → Coordinate with your team → Execute a valid turn → Adapt to changes → Learn from the outcome.*
