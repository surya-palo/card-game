# Emberfall — Duel of the Four Winds

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/competitions/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/surya-palo/card-game/rank.svg)](https://make.fun/competitions/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/surya-palo/card-game/reward.svg)](https://make.fun/competitions/best-card-game-20261122-1826)

An original duel card game built for the [make.fun "Make the best card game" bounty](https://make.fun/competitions/best-card-game-20261122-1826). You face Vex, the Stormcaller, across a felt table with a 24-card deck drawn from four Winds — Ember, Tide, Thorn and Storm — each told apart by colour and glyph shape.

## The rules

- **Win** by reducing Vex to 0 Life (both start at 30).
- Each turn: **+1 mana** (max 10) and **draw a card**.
- **The Rising Wind:** one Wind rises each turn — its cards cost 1 less.
- **Windfall:** play 2 cards of the same Wind in one turn to draw a card.
- **Creatures** stay on the table and attack from the turn after they arrive. Both sides take damage in a fight; hitting the hero is free.
- **Spells** strike once — damage, healing, card draw, board clears, buffs.
- An empty deck bites: drawing with no cards left deals rising fatigue damage.

## How it plays

Click a glowing card to play it, click a ready creature then an enemy to attack, `Space` ends your turn, `1–9` play a hand card, `Esc` cancels. Vex is a heuristic opponent that removes big threats, heals when hurt, draws when its hand runs dry, trades up and goes lethal when it can — and every move lands in the duel log so you can read and counter it.

Cards slide, flip and snap into place; attacks lunge; damage floats off the table; a win rains embers. All sound is synthesized live with WebAudio — no audio files, no network.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `game/index.html` — title screen, table, end screens
- `game/css/table.css` — felt table, heroes, log, overlays, animations
- `game/css/cards.css` — card faces, backs, Wind themes, card states
- `game/js/cards.js` — the four Winds and the 24-card catalogue
- `game/js/state.js` — the rules engine: turns, mana, Rising Wind, Windfall, combat, fatigue
- `game/js/ai.js` — Vex, the heuristic opponent
- `game/js/render.js` — DOM rendering of hands, boards, heroes and log
- `game/js/anim.js` — floaters, lunges, card flight, ember rain
- `game/js/audio.js` — procedural WebAudio sound effects
- `game/js/main.js` — screens, input, the AI turn, screenshot states
- `game/js/rng.js` — seeded randomness
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — 4 real renders of the game's own code

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome. Screenshot states: `?shot=title`, `?shot=table`, `?shot=win`, `?shot=loss` (with `?seed=N` to pin the shuffle).

## License

MIT — see `LICENSE`.
