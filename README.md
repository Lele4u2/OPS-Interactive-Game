# Operation Pacific Shield — merged game update

This keeps the original **OPS** single-file design and the existing mission logic. The 2026-11-05 uploaded package added the real board images and physical-token Flight Ops; previously working features remain in place.

## Play the game

Open **https://lele4u2.github.io/OPS-Interactive-Game/**.

- `index.html` — complete standalone game, including all CSS, JavaScript and seven embedded board images.
- `ops.html` — exact alternate copy of the homepage game.
- `source/index.html`, `source/style.css`, `source/app.js`, `source/menu.js`, `source/table.js`, `source/images.js` — editable components of the same game.

## Boards and features

Existing: All Boards, Roles randomizer, CAOC, four MOBs, Load Planner, MEDCOM, CSpOC, theme settings, tutorial, playbook, local saved state, practice difficulty, solo computer opponent, Event/Risk flip cards, LIMFAC warnings, Power-before-Beddown, 10-RFI +5 MP, +5 MP qualifying fighter sorties, DP scoring, and a GM-set practice ENDEX target.

New: **Tabletop** has seven original board pictures (CAOC, MOB/FOS, C-130/C-17 and C-5 Loadout boards, MEDCOM base and hospitals, CSpOC) with pan/zoom. **Flight Ops** provides drag/tap counters, aircraft load configurations, visible MOB inventory, flight chalk submission, CAOC PPR/MOG review, route progression by turns, FOS unloading, and forklift or Game Master review when required.

## What is still a practice approximation

- Board images can be zoomed and panned, but full clickable hotspots and a true WebGL 3D tabletop are not implemented in this one-file build. The older `opt.html` simulator is preserved separately.
- The CAOC/MOB flight workflow is a local tabletop practice representation, not the official CAOC ATO worksheet or authoritative instructor adjudication.
- Sample Event/Risk cards are not the official cards; full MEDCOM/CSpOC rules, detailed task prerequisites, political assessment, and hex-based map movement remain incomplete.
- The coach/lobby menus came from a provider-specific prototype. They do not provide real online AI coaching or multiplayer synchronization on public GitHub Pages without a supported backend. Saved games are local to each browser.
- Official OPS victory is set by the assessing instructor. The game uses a **GM-defined practice MP target**; if unset, it must not automatically declare victory.

**Not included or published:** official OPS User Guide, OPORD, EXORD, FRAGORD, quickstart and Excel workbooks. Do not publish restricted exercise material.
