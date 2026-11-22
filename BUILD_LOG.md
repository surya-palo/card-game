# Emberfall — Build Log

## The game

**Emberfall — Duel of the Four Winds**: an original duel card game. You face
Vex, the Stormcaller, across a felt table. Both start at 30 Life with a
24-card deck drawn from four Winds — Ember (red, flame), Tide (blue, droplet),
Thorn (green, leaf), Storm (gold, bolt) — each told apart by colour AND glyph
shape, never text alone.

### Rules

- Each turn: +1 mana crystal (max 10) and draw a card.
- **The Rising Wind:** one Wind rises each turn; its cards cost 1 less.
- **Windfall:** play 2 cards of the same Wind in one turn to draw a card.
- **Creatures** stay on the table, attack from the turn after they arrive.
  Both sides take damage in a creature fight; hitting the hero is free.
- **Spells** strike once: direct damage, healing, card draw, board clears,
  buffs. Targeted spells ask the player to pick a victim.
- Empty deck: drawing with no cards left deals rising fatigue damage (1, 2, 3…).
- Win by reducing Vex to 0 Life.

### The opponent

Vex is a heuristic AI that reads the table: it removes creatures that threaten
lethal, clears wide boards, heals when hurt, draws when its hand runs dry,
buffs a board worth buffing, trades up when the numbers favour it, and goes
for the throat when lethal is on the table. Every move lands in the duel log,
step by step with pauses, so its choices can be read and countered.

### Feel

Cards deal in with a staggered slide, fly from hand to table when played,
hover-enlarge in the fan, and glow when playable or ready. Attacks lunge at
their target; damage floats off the table in red numbers; the hero shakes on
a hit; a win rains embers. All sound is synthesized live with WebAudio
(no audio files, no network): deal swish, play snap, attack thud, heal chime,
win fanfare, lose descent.

## Files

- `main.ts` — hand-in: copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `game/index.html` — title, table, end screens; SVG glyph defs
- `game/css/table.css` — felt table, heroes, log, overlays, animations
- `game/css/cards.css` — card faces, backs, Wind themes, card states
- `game/js/cards.js` — the four Winds + 24-card catalogue
- `game/js/state.js` — rules engine (turns, mana, Rising Wind, Windfall, combat, fatigue)
- `game/js/ai.js` — Vex, the heuristic opponent
- `game/js/render.js` — DOM rendering of hands, boards, heroes, log
- `game/js/anim.js` — floaters, lunges, card flight, ember rain
- `game/js/audio.js` — procedural WebAudio effects
- `game/js/main.js` — screens, input, AI turn, screenshot states
- `game/js/rng.js` — seeded randomness
- `vendor/makefun-game.ts` — kit dossier library, unchanged
- `screenshots/` — 4 real renders: table (cover), title, win, loss

## Play-test results (Playwright + headless Chromium, 1280×800)

- 0 JavaScript errors across all runs.
- Title screen: visible, 4-card fan (one per Wind). Play starts a game:
  5-card hand, 30/30 Life, 1/1 mana.
- Playing a card: board +1, hand −1. Ending the turn runs Vex's turn
  (log fills, Vex plays creatures) and returns to "Round 2 — Your turn".
- Attack: a ready creature striking Vex dropped foe Life 30 → 28.
- Headless engine soak: 30 full games with random legal play on both sides —
  all 30 ended with a winner (13–17 split), avg ~19 side-turns, max 32.
- Screenshots: 4 JPEGs, each under the 256 KiB gate cap
  (01-table ~94 KB, 02-title ~54 KB, 03-win ~64 KB, 04-loss ~52 KB).
- `main.ts` run twice: byte-identical `/output` (dossier.json included).

## Fixes from play-testing (second edit)

- **Player hero portrait vanished**: the confetti CSS class `.ember` collided
  with the portrait's Wind theme class `ember`, so the portrait inherited the
  ember-fall animation and flew off-screen. Renamed the confetti class to
  `.ember-particle` (anim.js + table.css); portrait now renders at 46×46
  inside the hero box, verified by measurement.
- **Title fan overlapped the blurb**: added top margin to `.title-blurb`.
- **"Duel Again" overlapped the stats box**: button now block-level, centred.
