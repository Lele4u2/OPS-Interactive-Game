# OPS (Operation Pacific Shield) – Complete Package

## Files
- `index.html` – the whole game in ONE file (code + styling inside). Upload this alone to GitHub Pages and it works.
- `ops.html` – identical copy of `index.html` under the name `ops`.
- `source/` – the same game split for editing: `index.html` (shell), `style.css` (look), `app.js` (all game logic).
- `OPS_Game_Guide` – **not included**. The separate full game guide, official OPS User Guide, OPORD, EXORD, FRAGORD, Quickstart, and Excel workbooks are intentionally excluded from this ZIP. Keep instructor-controlled documents outside public repositories.

## Boards (tabs)
All Boards, Roles (randomizer), CAOC, MOB 1-4, Load Planner, MEDCOM, CSpOC.

## Run it
Open `index.html` in any browser. No install, no server.

## Put it on GitHub
1. New repository. 2. Add `index.html` (drag and drop). 3. Settings > Pages > main branch, root. 4. Visit `https://<user>.github.io/<repo>/`.

## Edit it (code map in `source/app.js`)
`S` = whole game state (saved in the browser). `fresh()` new game. `caoc() mob(i) load() med() space() ov() roles()` draw each tab. `nextTurn() nextDay()` hold turn rules. `roll()` randomizes jobs. `draw()` re-renders.

## Do not publish
The official OPS User Guide, OPORD/EXORD/FRAGORD, Quickstart and Excel workbooks are "FOR OTS USE ONLY". Keep them out of any public repo; use a private repository if you store them.

## Repairs in this package
- Fixed a Chromium startup collision (`top` renamed to `renderTop`).
- Kept single-file `index.html` and `ops.html` identical; both are generated from the unchanged source layout (`source/index.html`, `source/style.css`, `source/app.js`).
- Added directly clickable, flipping Event and Risk card markers. Both draws are required before Next Turn; GM decides actual effects.
- Added flashing possible-LIMFAC warnings for Power/Beddown order, skipped cards and invalid launches; risky fighter launches and next-day welfare penalties request confirmation.
- Fixed negative load entries, RFI rollback/scoring, and raw-HTML handling in the Roles randomizer.
- Added logged turn/day completion marks on tasks, +1 MP deduction per five cumulative DP (no duplicate penalties), and a count of earned but unassigned Task 13 resource chits.
- Added optional GM-set **practice** victory MP target. When achieved, ENDEX shows **YOU WIN THE BATTLE!**; official victory still requires assessing-instructor adjudication.

## Still outside this digital companion
This is a tracker and playable practice interface, not a reproduction of all physical OPS mechanics. Exact hex map/aircraft movement, actual task staffing and logistics, host-nation permissions, detailed RFI answers, the official Event/Risk decks, instructor adjudications, full CSpOC/MEDCOM mechanics, and network multiplayer are not implemented. A task checkbox records a player's claimed completion; it is not evidence that all official prerequisites were met.
