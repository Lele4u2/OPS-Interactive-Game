# Operation Pacific Shield (OPS) – Digital Companion

A browser tracker for the OTS OPS board game (based on Kingfish ACE). No build step: open `index.html`.

## The game in one page
**Goal:** All teams cooperate to earn as many Mission Points (MP) as possible and defeat the PRC. Victory MP total is set by the assessing instructor.

**Teams:** 1 CAOC (CFACC), 1 CSpOC (CFSCC), 3–4 MOBs (Kadena, Andersen, Yokota, Osan or JBPHH), plus MEDCOM and Game Masters.

**MOB mission:** Move people, equipment and commodities by air from the MOB to Forward Operating Sites (FOS), build up each FOS, then launch fighters from it.

**Turn flow** (planning ~30 min, last 15 min for RFIs and briefing, then execution)
1. Read the OPORD/EXORD/FRAGORD (know commander's intent).
2. Political assessment: check Base Access and Overflight.
3. CFACC apportions mobility aircraft (daily pool: 12 C-17, 12 C-130, 4 C-5 on the CAOC board).
4. MOBs choose airfields, ask RFIs (5 per airfield to gain assets), plan loads and flight plans.
5. CAOC verifies flight plans, workload and airfield MOG, then issues a PPR per landing.
6. Execute: move aircraft, download cargo, assign personnel/equipment to tasks, answer RFIs, launch fighters, pay logistics tax.
7. One Event card and one Risk card per turn (d4 for team, d4 for FOS); effects apply next turn at about 50% duration.

**Aircraft**
| Aircraft | Range/turn | Pallet positions (PP) | Mixed | Pax only |
|---|---|---|---|---|
| C-17 | 4 hexes | 18 | 11 PP + 54 pax | 102 |
| C-130 | 3 hexes | 8 | 2 PP + 62 pax | 128 |
| C-5 | 4 hexes | 36 | 36 PP + 73 pax (no pallet-only option) | 329 |
(Verified against board images, not the guide text — check them.) One hex = 200 nm. An en-route download costs 1 hex of range. Fighters fly up to 4 hexes.

**FOS tasks (16):** Establish 1 Bed down & Sanitation, 2 Power, 3 Command & Control, 4 Contracts. Defend 5 Ramp Security, 6 Perimeter Security, 7 Missile Defense, 8 Camouflage & Hardening. Operate 9 Airfield Ops, 10 Mobility Support, 11 Integrated Combat Turn, 12 Specialized Refueling. Maintain 13 Host Nation Relations, 14 Health & Welfare, 15 Base Recovery, 16 Logistics Support.
Establish and Operate must be complete to launch fighters.

**Scoring**
- +5 MP: complete airfield assessment (all 10 RFIs answered).
- +5 MP: each fighter sortie launched into an activated area (costs fuel, munitions; one fuel, one bomb, one missile per sortie).
- Conflict kills: 20-strength PLA token 10 MP, 12-strength 7 MP, 10-strength 5 MP.
- Resource Points: task 13 resourced = +2 RP per turn; 3 RP = 1 resource chit.
- Demoralization Points (DP): task 14 incomplete = 5 DP per day; also for deployed-vs-tasked ratios and no food/water (see guide).
- Each block, MOBs receive 4 fuel, ammo, missile and bomb via sealift.

**Combat:** roll a die equal to fighter strength vs enemy strength (10/12/20); higher wins. F-22 rolls d20.

## What this app implements
All Boards overview, Roles randomizer, CAOC (turns, score, aircraft pool, Event/Risk target rolls, combat, dice), 4 MOB boards (16 tasks x 4 FOS, RFIs, tokens, fighter count, launch rules), Load Planner, MEDCOM, CSpOC.

## Not yet built (good next steps)
1. Main map with hexes, aircraft movement and range checks (`DEFINITIONS` for hexes come from the board / User Guide Appendix A).
2. Per-task requirements (personnel, equipment, PP) and commodity costs from the airfield board.
3. RFI answer text and Event/Risk card decks.
4. Political assessment (Base Access / Overflight by country) and crisis/conflict phases by day.
5. Conflict ops: PLA strike data, intelligence/information attacks, airfield attack.
6. Full MEDCOM and CSpOC rules (read the User Guide chapters for each).
7. Multiplayer sync between teams.

## Code map
- `index.html` – shell. `style.css` – theme (light/dark).
- `app.js` – `S` is the whole game state (saved to localStorage). `fresh()` builds a new game; `caoc()`, `mob(i)`, `load()`, `med()`, `space()` render each board; `nextTurn()` / `nextDay()` hold turn rules; `draw()` re-renders.

## Run / deploy
Open `index.html`, or push the folder to GitHub and enable Pages (Settings, Pages, main branch, root).
Source rules: OPS User Guide (CAO 9 Jun 2026), Expectations Brief, Quickstart Guide. Training use only.

## Digital companion reliability notes (repaired package)
Two clickable practice card backs now record Event and Risk draws separately and block the Next Turn button until both have been drawn. These are **not** the official printed card deck or its effects. Task 1 Beddown is blocked until Task 2 Power is marked complete; other per-task staffing and equipment prerequisites remain for GM review. Task completion is stamped with its digital day and turn.

The GM can enter a victory MP target in CAOC. An ENDEX training victory message appears when that entered target is reached. This is **not** an official instructor decision. RFI completion earns 5 MP for a full set of ten answers and reverses that award if an answer is withdrawn. Task 13 produces unassigned resource chits recorded in CAOC; the GM assigns actual food/water/tent/fuel resources on the physical board. Every five accumulated DP deducts one MP once.

No official guide, orders, Quickstart, Excel workbooks, or official board graphics are included in this package.
