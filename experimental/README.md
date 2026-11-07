# OPS physical-board integration: source review and next steps

This branch adds an **isolated, functional, public-fictional training prototype** at `experimental/ops-piece-playtest.html`. It is not loaded by `opt.html` and does not modify the existing live game.

## User-supplied ZIP analyzed

The uploaded `files (2).zip` included `table.js` (~20 KB) and `theater.js` (~7 KB).

### table.js contains
- Counter sprites and types for teams, forklifts, pickups, fuel drums, ammunition, generators, firetrucks, fuel trucks, tents, medical equipment.
- Aircraft load configurations, passenger/pallet checks, load/unload flows and CFAC approval concepts.
- A five-step-style guided delivery scenario and a proposed visual tabletop.
- Rules such as C-5 risk, PPR and MOG checks; these are **not independently verified** and must not be treated as authoritative.

### theater.js contains
- A proposed overlay for numbered hexes and 45 airfields.
- Aircraft route drawing, pathfinding, hex navigation, FOS selection and movement animation.
- Hard-coded coordinates, locations and scenario-specific labels that must be validated against **authorized** board artwork and approved data.

The two ZIP scripts **cannot be directly loaded into the present V4 page**: they refer to global variables such as `S`, `TABS`, `draw()`, and `IMG` belonging to a different earlier application architecture. The current V4 game is packaged in a separate closure in `ops-v4.js`.

Do not publish or merge raw uploaded source assets or scenario-specific tables without reviewing authorization. This public branch intentionally does **not** copy original exercise-only tables, code or imagery from the ZIP.

## What the new playtest demonstrates

- Physical-looking circular pieces with unique counter IDs.
- Drag-and-drop between the practice MOB, aircraft loading bay and FOS.
- A keyboard alternative for basic piece movement.
- Serverless local practice-state persistence in the browser.
- Atomic client-side validation for *fictional* aircraft capacity, current phase and unloading requirements.
- Explicit file -> simulated approve -> execute flight statuses.
- Cargo retained onboard until a legal unload action.
- A fictional task requiring already delivered counters, without double completion.
- D4/D10/D20 **practice only** rolls and harmless fictional card draws.
- Local play-by-play event log and downloadable practice debrief.

## What is not complete

This prototype **does not yet** provide: an authoritative multiplayer server, GM authentication or permissions, synchronized class rooms, original hex-level movement, approved PPR/MOG calculations, official token inventories/aircraft load tables, official Event/Risk cards, approved scoring/DP/RP, 16 authentic tasks with prerequisites, institutional scenario orders, instructor adjudication, and persistent server-side replay.

## Implementation roadmap

1. Review the repository's existing exposed `EXECUTION ONLY` files and original board images for distribution authorization before sending class invitations. Move restricted assets to approved access-controlled storage if appropriate.
2. Confirm the authoritative guide revision and transcribe an approved, versioned **counter catalog**, board coordinate zones, task prerequisite graph, aircraft load configurations and scoring table. Tag each value with an explicit source and mark unknown values as unverified.
3. Refactor V4 toward a standalone game-state/rules module, with serializable actions (e.g. `reserve_counter`, `load_counter`, `file_ato`, `approve_ato`, `move_aircraft`, `unload_counter`, `assign_task`). All changes must be validated and committed once.
4. Calibrate SVG/image overlay zones against the actual original board's pixel dimensions. Never scale coordinates independently of the underlying source image.
5. Connect V4 board rendering to the state module; animations should only reflect committed transactions.
6. Build an authenticated authoritative room server (GitHub Pages alone cannot host it), role-controlled actions, conflict protection, persistence, and reconnection.
7. Run a two-browser classroom test: same uniquely identified counter loaded, moved, unloaded, assigned, saved and replayed with matching state on both clients.
8. Only then merge into the live classroom experience, keeping fictional public and authorized institutional modes separate.

## Quick local test

Open `experimental/ops-piece-playtest.html` in a browser. Drag a TEAM counter into the C-17 bay, drag FUEL and FORKLIFT into the bay, file and approve, execute, then drag the pieces to the FOS and complete the sample task. The 3-slot limit and forklift rule are fictional examples, NOT OPS specifications.

This proof of interaction is deliberately separate from the existing site and does not claim a finished OPS game.
