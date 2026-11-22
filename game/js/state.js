// Emberfall's rules engine: turns, mana, the Rising Wind, Windfall combos,
// combat, fatigue and the win. The engine owns the state and returns event
// lists describing what happened, so the UI can animate and narrate them.
//
// Sides are 'you' (the player, bottom of the table) and 'foe' (Vex, top).
// A card instance is a catalogue definition plus a uid, current hp and
// attack readiness. A target is { kind: 'hero', side } or
// { kind: 'creature', side, uid }.

import { WINDS, WIND_KEYS, buildDeck } from './cards.js';
import { mulberry32, shuffleInPlace, pickOne } from './rng.js';

export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_HAND = 10;
export const MAX_BOARD = 7;
export const START_HAND = 4;

let nextUid = 1;

function freshSide(deck) {
  return {
    life: MAX_LIFE,
    mana: 0,
    maxMana: 0,
    deck,
    hand: [],
    board: [],
    fatigue: 0,
    playedThisTurn: [],
    damageDealt: 0,
  };
}

export function newGame(seed) {
  nextUid = 1;
  const rand = mulberry32(seed);
  const state = {
    seed,
    rand,
    turn: 0,
    active: 'you',
    phase: 'playing',
    rising: pickOne(WIND_KEYS, rand),
    winner: null,
    you: freshSide(shuffleInPlace(buildDeck(), rand)),
    foe: freshSide(shuffleInPlace(buildDeck(), rand)),
    log: [],
    stats: { turns: 0, cardsPlayed: 0, damageDealt: 0, cardsDrawn: 0 },
  };
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(state, 'you');
    drawCard(state, 'foe');
  }
  startTurn(state, 'you');
  return state;
}

export function other(side) {
  return side === 'you' ? 'foe' : 'you';
}

// The Rising Wind's cards cost 1 less this turn (never below 0).
export function effectiveCost(state, card) {
  if (card.wind === state.rising) return Math.max(0, card.cost - 1);
  return card.cost;
}

export function windOf(state) {
  return WINDS[state.rising];
}

// A spell needs the player to pick a target when its effect names one.
export function needsTarget(card) {
  const fx = card.effect;
  if (!fx) return false;
  return fx.kind === 'damage' || fx.kind === 'damageHeal';
}

export function canPlay(state, side, card) {
  const me = state[side];
  if (state.phase !== 'playing' || state.active !== side) return false;
  if (effectiveCost(state, card) > me.mana) return false;
  if (card.type === 'creature' && me.board.length >= MAX_BOARD) return false;
  return true;
}

export function canAttackWith(creature) {
  return creature.canAttack === true;
}

function drawCard(state, side) {
  const me = state[side];
  if (me.deck.length === 0) {
    me.fatigue += 1;
    me.life -= me.fatigue;
    state.log.push({ side, text: `${side === 'you' ? 'You' : 'Vex'} draw from an empty deck: ${me.fatigue} fatigue damage.` });
    return { type: 'fatigue', side, amount: me.fatigue };
  }
  const card = me.deck.pop();
  if (me.hand.length >= MAX_HAND) {
    state.log.push({ side, text: `${card.name} burns — hand full.` });
    return { type: 'burn', side, card };
  }
  me.hand.push(card);
  state.stats.cardsDrawn += 1;
  return { type: 'draw', side, card };
}

export function startTurn(state, side) {
  const me = state[side];
  state.active = side;
  state.turn += 1;
  state.stats.turns = Math.max(state.stats.turns, Math.ceil(state.turn / 2));
  me.maxMana = Math.min(MAX_MANA, me.maxMana + 1);
  me.mana = me.maxMana;
  me.playedThisTurn = [];
  state.rising = pickOne(WIND_KEYS, state.rand);
  for (const creature of me.board) creature.canAttack = true;
  const events = [{ type: 'turn', side, rising: state.rising, turn: state.turn }];
  const drawn = drawCard(state, side);
  if (drawn) events.push(drawn);
  checkEnd(state, events);
  return events;
}

export function endTurn(state) {
  return startTurn(state, other(state.active));
}

// Play a card from a hand. For a targeted spell, `target` names the victim.
// Returns the events the play produced.
export function playCard(state, side, handIndex, target) {
  const me = state[side];
  const card = me.hand[handIndex];
  const events = [];
  if (!card || !canPlay(state, side, card)) return events;
  const cost = effectiveCost(state, card);
  me.mana -= cost;
  me.hand.splice(handIndex, 1);
  state.stats.cardsPlayed += 1;
  me.playedThisTurn.push(card.wind);
  events.push({ type: 'play', side, card, cost });

  // Windfall: a second card of one Wind in a turn draws a card.
  const sameWind = me.playedThisTurn.filter((w) => w === card.wind).length;
  if (sameWind === 2) {
    events.push({ type: 'windfall', side, wind: card.wind });
    const drawn = drawCard(state, side);
    if (drawn) events.push(drawn);
  }

  if (card.type === 'creature') {
    const creature = {
      ...card,
      uid: nextUid,
      maxHp: card.hp,
      canAttack: false,
    };
    nextUid += 1;
    me.board.push(creature);
    events.push({ type: 'summon', side, creature });
    if (card.battlecry) applyEffect(state, side, card.battlecry, null, events);
  } else {
    events.push({ type: 'spell', side, card });
    applyEffect(state, side, card.effect, target, events);
  }
  checkEnd(state, events);
  return events;
}

function damageCreature(state, side, creature, amount, events) {
  creature.hp -= amount;
  events.push({ type: 'damage', side, target: { kind: 'creature', side, uid: creature.uid }, amount, hpLeft: creature.hp });
  if (creature.hp <= 0) {
    const board = state[side].board;
    const at = board.findIndex((c) => c.uid === creature.uid);
    if (at !== -1) board.splice(at, 1);
    events.push({ type: 'death', side, creature });
  }
}

function damageHero(state, side, amount, events) {
  const hero = state[side];
  hero.life -= amount;
  events.push({ type: 'damage', side, target: { kind: 'hero', side }, amount, hpLeft: hero.life });
}

function applyEffect(state, side, fx, target, events) {
  if (!fx) return;
  const foe = other(side);
  if (fx.kind === 'damage' || fx.kind === 'damageHeal') {
    if (!target) return;
    if (target.kind === 'hero') {
      damageHero(state, target.side, fx.amount, events);
      if (target.side === foe) state[side].damageDealt += fx.amount;
    } else {
      const victim = state[target.side].board.find((c) => c.uid === target.uid);
      if (victim) damageCreature(state, target.side, victim, fx.amount, events);
    }
    if (fx.kind === 'damageHeal') {
      const me = state[side];
      const healed = Math.min(fx.heal, MAX_LIFE - me.life);
      me.life += healed;
      events.push({ type: 'heal', side, amount: healed });
    }
  } else if (fx.kind === 'damageAll') {
    for (const creature of [...state[foe].board]) damageCreature(state, foe, creature, fx.amount, events);
    if (fx.hero > 0) {
      damageHero(state, foe, fx.hero, events);
      state[side].damageDealt += fx.hero;
    }
  } else if (fx.kind === 'heal') {
    const me = state[side];
    const healed = Math.min(fx.amount, MAX_LIFE - me.life);
    me.life += healed;
    events.push({ type: 'heal', side, amount: healed });
  } else if (fx.kind === 'draw') {
    for (let i = 0; i < fx.amount; i += 1) {
      const drawn = drawCard(state, side);
      if (drawn) events.push(drawn);
    }
  } else if (fx.kind === 'buff') {
    for (const creature of state[side].board) {
      creature.hp += fx.hp;
      creature.maxHp += fx.hp;
    }
    events.push({ type: 'buff', side, hp: fx.hp });
  }
}

// One creature attacks a hero or a creature. Both sides take damage in a
// creature fight; a hero hit is free.
export function attack(state, side, attackerUid, target) {
  const events = [];
  const me = state[side];
  const foe = other(side);
  const attacker = me.board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack || state.phase !== 'playing' || state.active !== side) return events;
  attacker.canAttack = false;
  events.push({ type: 'attack', side, attacker, target });
  if (target.kind === 'hero') {
    damageHero(state, foe, attacker.atk, events);
    me.damageDealt += attacker.atk;
    state.stats.damageDealt += attacker.atk;
  } else {
    const defender = state[foe].board.find((c) => c.uid === target.uid);
    if (!defender) return events;
    damageCreature(state, foe, defender, attacker.atk, events);
    damageCreature(state, side, attacker, defender.atk, events);
  }
  checkEnd(state, events);
  return events;
}

export function checkEnd(state, events) {
  if (state.phase !== 'playing') return;
  if (state.you.life <= 0 && state.foe.life <= 0) {
    state.winner = state.active === 'you' ? 'foe' : 'you';
  } else if (state.you.life <= 0) {
    state.winner = 'foe';
  } else if (state.foe.life <= 0) {
    state.winner = 'you';
  } else {
    return;
  }
  state.phase = 'over';
  if (events) events.push({ type: 'win', winner: state.winner });
}

export function describeEvent(ev) {
  const who = ev.side === 'you' ? 'You' : 'Vex';
  switch (ev.type) {
    case 'play': return `${who} play${ev.side === 'you' ? '' : 's'} ${ev.card.name}.`;
    case 'summon': return `${ev.creature.name} joins the table.`;
    case 'damage': {
      if (ev.target.kind === 'hero') return `${ev.side === 'you' ? 'You take' : 'Vex takes'} ${ev.amount} damage.`;
      return `${ev.amount} damage dealt.`;
    }
    case 'heal': return `${who} restore${ev.side === 'you' ? '' : 's'} ${ev.amount} Life.`;
    case 'draw': return `${who} draw${ev.side === 'you' ? '' : 's'} a card.`;
    case 'death': return `${ev.creature.name} is destroyed.`;
    case 'attack': return `${ev.attacker.name} attacks${ev.target.kind === 'hero' ? ' the hero' : ''}!`;
    case 'fatigue': return `${who} take${ev.side === 'you' ? '' : 's'} ${ev.amount} fatigue damage.`;
    case 'windfall': return `Windfall! Two ${WINDS[ev.wind].name} cards — ${who} draw${ev.side === 'you' ? '' : 's'} a card.`;
    case 'turn': return `Turn ${Math.ceil(ev.turn / 2)} — ${WINDS[ev.rising].name} rises.`;
    case 'buff': return `${who}'s creatures gain +${ev.hp} Health.`;
    default: return '';
  }
}
