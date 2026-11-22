// Emberfall's conductor: screens, input, the AI's turn, event narration
// and the screenshot states. The engine owns the rules (state.js); this
// module owns everything the player sees and touches.
//
// Screenshot states, driven by the URL so a headless browser can stage
// them exactly: ?shot=title | table | win | loss, with ?seed=N pinning
// the shuffle.

import { newGame, playCard, attack, endTurn, other, needsTarget, canPlay, canAttackWith, describeEvent, MAX_LIFE } from './state.js';
import { nextAction } from './ai.js';
import { renderGame, renderTitleFan } from './render.js';
import { sfx } from './audio.js';
import { floatText, lunge, flyCard, shake, emberRain, sleep, centerOf } from './anim.js';
import { cardById, buildDeck } from './cards.js';

let state = null;
const ui = { selectedHand: null, selectedAttacker: null, targeting: null, dealt: false };
let busy = false;
let shotMode = null;

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  for (const id of ['title-screen', 'game-screen', 'end-screen']) {
    const node = $(id);
    if (node) node.classList.toggle('show', id === `${name}-screen`);
  }
}

function setHint(text) {
  const hint = $('hint');
  if (hint) hint.textContent = text;
}

function clearSelection() {
  ui.selectedHand = null;
  ui.selectedAttacker = null;
  ui.targeting = null;
  document.querySelectorAll('.targetable-hero').forEach((n) => n.classList.remove('targetable-hero'));
}

function elementForTarget(target) {
  if (!target) return null;
  if (target.kind === 'hero') return $(`${target.side}-hero`);
  return document.querySelector(`[data-uid="${target.uid}"]`);
}

function pushLog(events) {
  for (const ev of events) {
    const text = describeEvent(ev);
    if (text) state.log.push({ side: ev.side || state.active, text });
  }
}

function soundFor(ev) {
  switch (ev.type) {
    case 'play': return 'play';
    case 'draw': return 'draw';
    case 'attack': return 'attack';
    case 'damage': return 'damage';
    case 'heal': return 'heal';
    case 'windfall': return 'windfall';
    case 'turn': return 'turn';
    default: return null;
  }
}

// Play one batch of engine events out loud: log lines, sounds, motion,
// then a re-render, then the end screen if the duel is over.
async function narrate(events) {
  pushLog(events);
  for (const ev of events) {
    const sound = soundFor(ev);
    if (sound) sfx.play(sound);
  }
  for (const ev of events) {
    if (ev.type === 'attack') {
      const attackerEl = document.querySelector(`[data-uid="${ev.attacker.uid}"]`);
      const targetEl = elementForTarget(ev.target);
      await lunge(attackerEl, targetEl);
    }
    if (ev.type === 'play' && ev.side === 'you' && ev.card.type === 'creature') {
      const handEl = document.querySelector(`[data-hand-index="${ui.selectedHand}"]`);
      const board = $('you-board');
      if (handEl && board) {
        const c = centerOf(board);
        await flyCard(handEl, c.x, c.y);
      }
    }
    if (ev.type === 'damage') {
      const targetEl = elementForTarget(ev.target);
      if (targetEl) {
        const c = centerOf(targetEl);
        floatText(c.x, c.y - 10, `-${ev.amount}`, 'dmg');
        if (ev.target.kind === 'hero') shake(targetEl);
      }
    }
    if (ev.type === 'heal') {
      const heroEl = $(`${ev.side}-hero`);
      if (heroEl) {
        const c = centerOf(heroEl);
        floatText(c.x, c.y - 10, `+${ev.amount}`, 'heal');
      }
    }
    if (ev.type === 'windfall') {
      const heroEl = $(`${ev.side}-hero`);
      if (heroEl) {
        const c = centerOf(heroEl);
        floatText(c.x, c.y - 40, 'Windfall!', 'windfall');
      }
    }
  }
  clearSelection();
  renderGame(state, ui);
  if (state.phase === 'over') {
    await sleep(500);
    showEndScreen();
  }
}

function showEndScreen() {
  const won = state.winner === 'you';
  const title = $('end-title');
  const sub = $('end-subtitle');
  const stats = $('end-stats');
  if (title) title.textContent = won ? 'VICTORY' : 'DEFEAT';
  if (title) title.className = `end-title ${won ? 'win' : 'lose'}`;
  if (sub) sub.textContent = won ? 'The Four Winds bow to you, duelist.' : 'Vex claims the table… this time.';
  if (stats) {
    stats.innerHTML = '';
    const rows = [
      ['Rounds played', String(state.stats.turns)],
      ['Cards played', String(state.stats.cardsPlayed)],
      ['Damage dealt', String(state.stats.damageDealt)],
      ['Cards drawn', String(state.stats.cardsDrawn)],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('strong');
      v.textContent = value;
      row.appendChild(l);
      row.appendChild(v);
      stats.appendChild(row);
    }
  }
  $('end-screen').classList.add('show');
  if (won) {
    sfx.play('win');
    emberRain(80);
  } else {
    sfx.play('lose');
  }
}

function startGame(seed) {
  state = newGame(seed);
  ui.dealt = true;
  state.log.push({ side: 'you', text: 'The duel begins. Emberfall awaits.' });
  state.log.push({ side: 'foe', text: 'Vex shuffles a deck of 24 cards.' });
  showScreen('game');
  renderGame(state, ui);
  sfx.play('deal');
  setHint('Click a glowing card to play it. Click a ready creature, then an enemy, to attack.');
  setTimeout(() => { ui.dealt = false; }, 1200);
}

async function runAiTurn() {
  busy = true;
  setHint("Vex is thinking…");
  await sleep(800);
  while (state && state.phase === 'playing' && state.active === 'foe') {
    const action = nextAction(state);
    if (!action) break;
    let events = [];
    if (action.type === 'play') {
      events = playCard(state, 'foe', action.handIndex, action.target);
    } else if (action.type === 'attack') {
      events = attack(state, 'foe', action.attackerUid, action.target);
    }
    await narrate(events);
    await sleep(700);
  }
  if (state && state.phase === 'playing' && state.active === 'foe') {
    const events = endTurn(state);
    await narrate(events);
    setHint('Your turn. The Rising Wind favours its cards.');
  }
  busy = false;
}

async function playerEndTurn() {
  if (!state || busy || state.phase !== 'playing' || state.active !== 'you') return;
  sfx.play('click');
  clearSelection();
  const events = endTurn(state);
  await narrate(events);
  if (state.phase === 'playing') runAiTurn();
}

function validTargetFor(card, target) {
  const fx = card.effect;
  if (!fx) return false;
  if (fx.kind === 'damage' && fx.target === 'any') return true;
  if ((fx.kind === 'damage' || fx.kind === 'damageHeal') && fx.target === 'creature') return target.kind === 'creature';
  return false;
}

function markTargets(card) {
  document.querySelectorAll('.targetable-hero').forEach((n) => n.classList.remove('targetable-hero'));
  const fx = card.effect;
  if (fx && fx.kind === 'damage' && fx.target === 'any') {
    $('you-hero').classList.add('targetable-hero');
    $('foe-hero').classList.add('targetable-hero');
  }
  ui.targeting = card;
  renderGame(state, ui);
}

async function tryPlayHandCard(index) {
  if (!state || busy || state.phase !== 'playing' || state.active !== 'you') return;
  const card = state.you.hand[index];
  if (!card) return;
  if (!canPlay(state, 'you', card)) {
    const node = document.querySelector(`[data-hand-index="${index}"]`);
    shake(node);
    setHint(card.type === 'creature' && state.you.board.length >= 7 ? 'Your board is full.' : 'Not enough mana for that card.');
    return;
  }
  if (card.type === 'spell' && needsTarget(card)) {
    ui.selectedHand = index;
    markTargets(card);
    setHint(`Choose a target for ${card.name} — or press Esc to cancel.`);
    return;
  }
  ui.selectedHand = index;
  const events = playCard(state, 'you', index, null);
  await narrate(events);
  setHint('Card played. Attack with ready creatures, or end your turn.');
}

async function tryAttackTarget(target) {
  if (!state || busy || state.phase !== 'playing' || state.active !== 'you') return;
  if (ui.targeting) {
    const card = ui.targeting;
    const index = ui.selectedHand;
    if (index === null || !validTargetFor(card, target)) {
      setHint('That is not a valid target for this spell.');
      return;
    }
    const events = playCard(state, 'you', index, target);
    await narrate(events);
    setHint('Spell cast.');
    return;
  }
  if (ui.selectedAttacker !== null) {
    const attacker = state.you.board.find((c) => c.uid === ui.selectedAttacker);
    if (!attacker || !canAttackWith(attacker)) {
      clearSelection();
      renderGame(state, ui);
      return;
    }
    if (target.side === 'you') {
      setHint('Attack Vex or one of their creatures.');
      return;
    }
    const events = attack(state, 'you', ui.selectedAttacker, target);
    await narrate(events);
    setHint('Attack! Ready creatures can strike again next turn.');
  }
}

function selectAttacker(uid) {
  if (!state || busy || state.phase !== 'playing' || state.active !== 'you') return;
  const creature = state.you.board.find((c) => c.uid === uid);
  if (!creature) return;
  if (!canAttackWith(creature)) {
    const node = document.querySelector(`[data-uid="${uid}"]`);
    shake(node);
    setHint(`${creature.name} is resting — creatures strike from the turn after they arrive.`);
    return;
  }
  ui.selectedAttacker = ui.selectedAttacker === uid ? null : uid;
  ui.targeting = null;
  sfx.play('click');
  renderGame(state, ui);
  setHint(ui.selectedAttacker === null ? 'Attacker cleared.' : `Now click Vex or one of their creatures to attack with ${creature.name}.`);
}

function wireInput() {
  $('you-hand').addEventListener('click', (e) => {
    const cardEl = e.target.closest('[data-hand-index]');
    if (!cardEl) return;
    sfx.unlock();
    tryPlayHandCard(Number(cardEl.dataset.handIndex));
  });
  $('you-board').addEventListener('click', (e) => {
    const cardEl = e.target.closest('[data-uid]');
    if (!cardEl) return;
    selectAttacker(Number(cardEl.dataset.uid));
  });
  $('foe-board').addEventListener('click', (e) => {
    const cardEl = e.target.closest('[data-uid]');
    if (!cardEl) return;
    tryAttackTarget({ kind: 'creature', side: 'foe', uid: Number(cardEl.dataset.uid) });
  });
  $('foe-hero').addEventListener('click', () => {
    tryAttackTarget({ kind: 'hero', side: 'foe' });
  });
  $('you-hero').addEventListener('click', () => {
    tryAttackTarget({ kind: 'hero', side: 'you' });
  });
  $('end-turn').addEventListener('click', playerEndTurn);
  $('play-btn').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('click');
    startGame((Math.random() * 1e9) | 0);
  });
  $('play-again-btn').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('click');
    $('end-screen').classList.remove('show');
    startGame((Math.random() * 1e9) | 0);
  });
  $('menu-btn').addEventListener('click', () => {
    sfx.play('click');
    showScreen('title');
  });
  $('sound-btn').addEventListener('click', () => {
    const on = !sfx.isEnabled();
    sfx.setEnabled(on);
    $('sound-btn').textContent = on ? 'Sound: on' : 'Sound: off';
    if (on) sfx.play('click');
  });
  $('howto-btn').addEventListener('click', () => {
    $('howto').classList.toggle('show');
  });
  $('howto-close').addEventListener('click', () => {
    $('howto').classList.remove('show');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSelection();
      if (state) renderGame(state, ui);
      $('howto').classList.remove('show');
    }
    if (e.key === ' ' && state && state.phase === 'playing' && state.active === 'you' && !busy) {
      e.preventDefault();
      playerEndTurn();
    }
    if (e.key >= '1' && e.key <= '9' && state && state.phase === 'playing' && state.active === 'you' && !busy) {
      tryPlayHandCard(Number(e.key) - 1);
    }
  });
}

// --- Screenshot states -------------------------------------------------

function scriptedCreature(id, canAttack) {
  const def = cardById(id);
  return { ...def, uid: 1000 + Math.floor(Math.random() * 9000), maxHp: def.hp, canAttack };
}

function setupShotTable() {
  state = newGame(7);
  ui.dealt = false;
  state.turn = 11;
  state.rising = 'ember';
  state.active = 'you';
  state.you.life = 24;
  state.you.mana = 6;
  state.you.maxMana = 6;
  state.you.deck = buildDeck().slice(0, 11);
  state.you.hand = ['ember-drake', 'tidal-surge', 'root-snare', 'stormcaller', 'flame-lash'].map((id) => ({ ...cardById(id) }));
  state.you.board = [
    scriptedCreature('cinder-wolf', true),
    scriptedCreature('coral-guard', true),
    scriptedCreature('gale-rider', false),
  ];
  state.foe.life = 19;
  state.foe.mana = 5;
  state.foe.maxMana = 6;
  state.foe.deck = buildDeck().slice(0, 13);
  state.foe.hand = ['spark-bat', 'thorn-sprout', 'healing-current', 'oakwarden'].map((id) => ({ ...cardById(id) }));
  state.foe.board = [
    scriptedCreature('bramble-bear', false),
    scriptedCreature('ember-drake', false),
  ];
  state.log = [
    { side: 'you', text: 'You play Cinder Wolf.' },
    { side: 'foe', text: 'Vex plays Bramble Bear.' },
    { side: 'you', text: 'Coral Guard attacks Vex!' },
    { side: 'you', text: 'Vex takes 2 damage.' },
    { side: 'foe', text: 'Vex plays Ember Drake.' },
    { side: 'you', text: 'Turn 6 — Ember rises.' },
  ];
  state.stats = { turns: 6, cardsPlayed: 14, damageDealt: 11, cardsDrawn: 10 };
  showScreen('game');
  renderGame(state, ui);
  setHint('Click a glowing card to play it. Click a ready creature, then an enemy, to attack.');
}

function setupShotEnd(won) {
  setupShotTable();
  state.phase = 'over';
  state.winner = won ? 'you' : 'foe';
  state.stats = { turns: 9, cardsPlayed: 23, damageDealt: won ? 34 : 21, cardsDrawn: 16 };
  if (won) {
    state.foe.life = 0;
    state.you.life = 12;
  } else {
    state.you.life = 0;
    state.foe.life = 8;
  }
  renderGame(state, ui);
  showEndScreen();
}

function boot() {
  renderTitleFan();
  wireInput();
  const params = new URLSearchParams(window.location.search);
  shotMode = params.get('shot');
  if (shotMode === 'table') {
    setupShotTable();
  } else if (shotMode === 'win') {
    setupShotEnd(true);
  } else if (shotMode === 'loss') {
    setupShotEnd(false);
  } else {
    showScreen('title');
  }
}

document.addEventListener('DOMContentLoaded', boot);
