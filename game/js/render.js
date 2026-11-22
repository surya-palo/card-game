// Emberfall's table: every DOM element the game shows, built from the
// state. Cards are real DOM — crisp at any size, readable at thumbnail —
// with the Wind told by colour and glyph shape. The renderer is a full
// re-render after each event batch; motion lives in anim.js on the
// effects layer, so a re-render never cuts it short.

import { WINDS } from './cards.js';
import { effectiveCost, canPlay, canAttackWith, other } from './state.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function glyphSvg(glyph, cls) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', cls || 'glyph');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#glyph-${glyph}`);
  svg.appendChild(use);
  return svg;
}

// One card face: cost gem, name, art band with the Wind glyph, type line,
// rules text, and attack / health pips for creatures.
export function cardFace(card, opts) {
  const o = opts || {};
  const wind = WINDS[card.wind];
  const node = el('div', `card wind-${card.wind}${o.compact ? ' compact' : ''}${o.playable ? ' playable' : ''}${o.selected ? ' selected' : ''}${o.sleeping ? ' sleeping' : ''}${o.ready ? ' ready' : ''}${o.targetable ? ' targetable' : ''}`);
  if (o.uid !== undefined) node.dataset.uid = String(o.uid);
  if (o.handIndex !== undefined) node.dataset.handIndex = String(o.handIndex);

  const cost = el('div', 'cost', String(o.cost !== undefined ? o.cost : card.cost));
  node.appendChild(cost);

  node.appendChild(el('div', 'card-name', card.name));

  const art = el('div', 'card-art');
  art.appendChild(glyphSvg(wind.glyph, 'art-glyph'));
  node.appendChild(art);

  node.appendChild(el('div', 'card-type', `${card.type === 'creature' ? 'Creature' : 'Spell'} — ${wind.name}`));

  const text = el('div', 'card-text', card.text || (card.type === 'creature' ? '' : ''));
  node.appendChild(text);

  if (card.type === 'creature') {
    const stats = el('div', 'card-stats');
    const atk = el('div', 'pip atk', String(card.atk));
    atk.title = 'Attack';
    const hp = el('div', 'pip hp', String(card.hp));
    hp.title = 'Health';
    if (card.hp < card.maxHp) hp.classList.add('hurt');
    stats.appendChild(atk);
    stats.appendChild(hp);
    node.appendChild(stats);
  }
  if (o.sleeping) node.appendChild(el('div', 'zzz', 'z z'));
  return node;
}

export function cardBack() {
  const node = el('div', 'card back');
  const sigil = el('div', 'back-sigil');
  sigil.appendChild(glyphSvg('flame', 'back-glyph'));
  node.appendChild(sigil);
  return node;
}

function renderHero(state, side) {
  const me = state[side];
  const prefix = side === 'you' ? 'you' : 'foe';
  const lifeEl = document.getElementById(`${prefix}-life`);
  const manaEl = document.getElementById(`${prefix}-mana`);
  const deckEl = document.getElementById(`${prefix}-deck`);
  if (lifeEl) lifeEl.textContent = String(Math.max(0, me.life));
  if (manaEl) manaEl.textContent = `${me.mana}/${me.maxMana}`;
  if (deckEl) deckEl.textContent = String(me.deck.length);
  const bar = document.getElementById(`${prefix}-life-bar`);
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, (me.life / 30) * 100))}%`;
  const heroEl = document.getElementById(`${prefix}-hero`);
  if (heroEl) {
    heroEl.classList.toggle('active-turn', state.active === side && state.phase === 'playing');
    heroEl.classList.toggle('low-life', me.life <= 10);
  }
}

function renderHand(state, side, ui) {
  const me = state[side];
  const handEl = document.getElementById(side === 'you' ? 'you-hand' : 'foe-hand');
  if (!handEl) return;
  handEl.innerHTML = '';
  if (side === 'foe') {
    me.hand.forEach(() => handEl.appendChild(cardBack()));
    return;
  }
  me.hand.forEach((card, index) => {
    const playable = canPlay(state, 'you', card);
    const node = cardFace(card, {
      cost: effectiveCost(state, card),
      playable,
      selected: ui.selectedHand === index,
      handIndex: index,
    });
    node.style.setProperty('--fan', String(index - (me.hand.length - 1) / 2));
    if (ui.dealt) node.classList.add('dealt');
    handEl.appendChild(node);
  });
}

function renderBoard(state, side, ui) {
  const me = state[side];
  const boardEl = document.getElementById(side === 'you' ? 'you-board' : 'foe-board');
  if (!boardEl) return;
  boardEl.innerHTML = '';
  if (me.board.length === 0) {
    const empty = el('div', 'board-empty', side === 'you' ? 'Your creatures gather here' : 'Vex has no creatures yet');
    boardEl.appendChild(empty);
    return;
  }
  me.board.forEach((creature) => {
    const isYours = side === 'you';
    const node = cardFace(creature, {
      compact: true,
      uid: creature.uid,
      sleeping: isYours && !canAttackWith(creature) && state.phase === 'playing',
      ready: isYours && canAttackWith(creature) && state.active === 'you' && state.phase === 'playing',
      selected: ui.selectedAttacker === creature.uid,
      targetable: ui.targeting && side === 'foe',
    });
    boardEl.appendChild(node);
  });
}

function renderWind(state) {
  const wind = WINDS[state.rising];
  const badge = document.getElementById('wind-badge');
  if (!badge) return;
  badge.className = `wind-badge wind-${state.rising}`;
  badge.innerHTML = '';
  badge.appendChild(glyphSvg(wind.glyph, 'wind-glyph'));
  const label = el('span', 'wind-label', `${wind.name} rises`);
  const sub = el('span', 'wind-sub', `${wind.name} cards cost 1 less`);
  badge.appendChild(label);
  badge.appendChild(sub);
}

function renderTurn(state) {
  const label = document.getElementById('turn-label');
  if (label) {
    label.textContent = state.phase === 'over'
      ? (state.winner === 'you' ? 'Victory!' : 'Defeat')
      : `Round ${Math.max(1, Math.ceil(state.turn / 2))} — ${state.active === 'you' ? 'Your turn' : "Vex's turn"}`;
  }
  const endBtn = document.getElementById('end-turn');
  if (endBtn) {
    endBtn.disabled = state.phase !== 'playing' || state.active !== 'you';
    endBtn.textContent = state.active === 'you' ? 'End Turn' : "Vex's turn…";
  }
}

function renderLog(state) {
  const list = document.getElementById('log-list');
  if (!list) return;
  list.innerHTML = '';
  const entries = state.log.slice(-9);
  entries.forEach((entry) => {
    const li = el('li', entry.side === 'you' ? 'log-you' : 'log-foe', entry.text);
    list.appendChild(li);
  });
  list.scrollTop = list.scrollHeight;
}

export function renderGame(state, ui) {
  renderHero(state, 'you');
  renderHero(state, 'foe');
  renderHand(state, 'you', ui);
  renderHand(state, 'foe', ui);
  renderBoard(state, 'you', ui);
  renderBoard(state, 'foe', ui);
  renderWind(state);
  renderTurn(state);
  renderLog(state);
  const table = document.getElementById('game-screen');
  if (table) table.classList.toggle('targeting', Boolean(ui.targeting));
}

export function renderTitleFan() {
  const fan = document.getElementById('title-fan');
  if (!fan) return;
  const samples = [
    { id: 'ember-drake', name: 'Ember Drake', wind: 'ember', type: 'creature', cost: 4, atk: 5, hp: 4, text: '' },
    { id: 'leviathan', name: 'Leviathan', wind: 'tide', type: 'creature', cost: 7, atk: 8, hp: 8, text: '' },
    { id: 'ancient-treant', name: 'Ancient Treant', wind: 'thorn', type: 'creature', cost: 6, atk: 6, hp: 8, text: '' },
    { id: 'stormcaller', name: 'Stormcaller', wind: 'storm', type: 'creature', cost: 5, atk: 6, hp: 5, text: '' },
  ];
  fan.innerHTML = '';
  samples.forEach((card, i) => {
    const node = cardFace(card, {});
    node.style.setProperty('--fan', String(i - 1.5));
    fan.appendChild(node);
  });
}
