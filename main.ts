// Emberfall's hand-in (Node 22, standard library only): the game lives in
// this repository's game/ folder as plain static files, and this program
// delivers it to the grader. It copies game/ and screenshots/ beside it
// into the output directory and writes dossier.json — the summary the
// judge reads — with the vendored make.fun dossier library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(destination, { recursive: true });
cpSync(gameDir, join(destination, 'game'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(destination, 'screenshots'), { recursive: true });
}

// The gate's caps: the dossier text is capped at 160 KiB; the rest refuse
// an entry the scorer would refuse (more than 4 screenshots, one over
// 256 KiB, or a game/ past its file, byte or path limits).
const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(destination, 'dossier.json'), dossier);
