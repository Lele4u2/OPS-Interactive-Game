# OPS Command Simulator V4 — How to Play

Play: https://lele4u2.github.io/OPS-Interactive-Game/

Modes:
- Guided: https://lele4u2.github.io/OPS-Interactive-Game/opt.html?mode=tutorial
- Computer: https://lele4u2.github.io/OPS-Interactive-Game/opt.html?mode=computer
- Free play: https://lele4u2.github.io/OPS-Interactive-Game/opt.html?mode=sandbox

## First mission
1. Open the original OPS MOB board (the default game view). Click Airfield 1–4 to choose which FOS you are commanding.
2. Click the Requests for Information (RFI) area on that actual board and request five initial responses. Continue follow-on RFIs when ready.
3. Open AIRLIFT and select a C-130 or C-17.
4. Load a five-person MRA team and forklift; submit the practice chalk.
5. Fly the mission and watch the aircraft arrive at your FOS. The site receives resources.
6. End the turn. Event and Risk cards are drawn if you have not drawn them yourself.
7. Select your aircraft and return it to MOB on the following turn.
8. On the original MOB board, click the Task 2 (Power) square; read the on-board guide and activate it. Once complete, choose Task 1 (Bed Down and Sanitation). Use FOCUS FOS to zoom into a board section.

## New features
- Playable and selectable aircraft/site tokens; the original MOB board also has interactive task markers.
- Aircraft out-and-back animation, status, resource/cargo transfer and saved position.
- In-game simulated Game Master and computer opposition that targets developed FOS.
- Guided tutorial, mission plans, C-5 D20 risk, event/risk decks with manual choice or random draw.
- Source-aligned complete ten-RFI assessment score, fighter capability gate and named task categories.
- Space and medical simulated counterplay, adjustable computer difficulty and sound.
- After-action metrics, per-turn review, printing/saving via browser, local mission save.

## Critical official/practice distinction
Verified from the OPS User Guide: 5 MP for ten-RFI assessment; 5 MP for qualifying FOS fighter sortie into an activated operational area; all Establish and Operate tasks required for fighter sorties; Task 1 requires Task 2, Task 10 requires Task 5; special C-5 FOS D20 outcomes; Event and Risk Card timing and D4 target rolls; aircraft return on a subsequent turn.

Practice mechanics (NOT official OPS rules): four-site schematic geography, limited aircraft fleet, illustrative cargo-slot capacities, simulated card texts and Event/Risk effects, computer opponent strategy, simplified task personnel/cost assumptions, support effects, and training point score. The game cannot replace official ATO, MOG, PPR, CSpOC or MEDCOM spreadsheets. The official decks, 45 FOS details and all execution-workbook mechanics have not been fully encoded.

Only distribute the original OPS material and any execution-only files to audiences authorized for them. Review what is already in this public GitHub repository before promoting it.

## Active source files
- index.html: cinematic mission lobby
- opt.html: V4 game shell
- ops-v4.css: look and animations
- ops-v4.js: game logic
- rules.js: shared source-aligned rule names and dice table

Older game.js, style.css, ops-tutorial.js, and ops-enhanced.js are not loaded by V4.

If a prior version appears, hard-refresh with Ctrl + Shift + R. GitHub Pages must publish the main branch's root directory.

## Original board tips
- Click an Airfield label in the center of the original MOB artwork to select that FOS.
- Click a numbered task marker on the printed square. The on-board instruction card describes that task and provides a START TASK button.
- Click an RFI area to request initial or remaining assessment responses.
- Use FOCUS FOS to zoom to your chosen section; FIT returns to the whole 4-section table.
- Click the aircraft/cargo counter marker to open the airlift planner alongside the original source board.
- Click CARDS for Event and Risk Card choices.
- The upper two tabletop sections are printed upside down for players sitting opposite one another; the on-screen instructions remain upright.
- You can also click the printed task squares beneath the markers; the selected area opens task guidance.
