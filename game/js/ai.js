// Vex, the Stormcaller: Emberfall's opponent. A heuristic player that
// reads the table and answers it — it removes big threats, heals when hurt,
// draws when its hand runs dry, trades up when the numbers favour it and
// goes for the throat when lethal is on the table.
//
// The UI asks for one action at a time (nextAction) and plays it out, so
// Vex's turn unfolds step by step where the player can read and counter it.

import { effectiveCost, needsTarget, other } from './state.js';

function handValue(card) {
  // Rough worth of a creature on the table, by stats per mana.
  if (card.type !== 'creature') return 0;
  return (card.atk * 2 + card.hp) / Math.max(1, card.cost);
}

function damageOf(card) {
  const fx = card.effect;
  if (!fx) return 0;
  if (fx.kind === 'damage' || fx.kind === 'damageHeal') return fx.amount;
  return 0;
}

function pickTargetFor(state, card) {
  const foe = other('foe');
  const enemyBoard = state[foe].board;
  const fx = card.effect;
  if (!fx) return null;
  if (fx.kind === 'damage' && fx.target === 'any') {
    // Kill the biggest threat it can, else hit the hero when lethal is near.
    const killable = enemyBoard.filter((c) => c.hp <= fx.amount).sort((a, b) => b.atk - a.atk);
    if (killable.length > 0) return { kind: 'creature', side: foe, uid: killable[0].uid };
    if (state[foe].life <= fx.amount + 2) return { kind: 'hero', side: foe };
    const biggest = [...enemyBoard].sort((a, b) => b.atk - a.atk)[0];
    if (biggest && biggest.atk >= 4) return { kind: 'creature', side: foe, uid: biggest.uid };
    return { kind: 'hero', side: foe };
  }
  if ((fx.kind === 'damage' || fx.kind === 'damageHeal') && fx.target === 'creature') {
    if (enemyBoard.length === 0) return null;
    const killable = enemyBoard.filter((c) => c.hp <= fx.amount).sort((a, b) => b.atk - a.atk);
    if (killable.length > 0) return { kind: 'creature', side: foe, uid: killable[0].uid };
    const biggest = [...enemyBoard].sort((a, b) => b.atk - a.atk)[0];
    return { kind: 'creature', side: foe, uid: biggest.uid };
  }
  return null;
}

// Choose the best card Vex can play right now, or null.
function choosePlay(state) {
  const me = state.foe;
  const enemy = state.you;
  const playable = me.hand
    .map((card, index) => ({ card, index, cost: effectiveCost(state, card) }))
    .filter((entry) => entry.cost <= me.mana)
    .filter((entry) => entry.card.type !== 'creature' || me.board.length < 7);
  if (playable.length === 0) return null;

  const has = (pred) => playable.find((entry) => pred(entry.card)) || null;

  // 1. Remove a threat that can kill Vex soon.
  const threat = [...enemy.board].sort((a, b) => b.atk - a.atk)[0];
  if (threat && threat.atk >= 4) {
    const removal = has((c) => c.type === 'spell' && damageOf(c) >= threat.hp && needsTarget(c));
    if (removal) {
      const target = pickTargetFor(state, removal.card);
      if (target) return { type: 'play', handIndex: removal.index, target };
    }
  }

  // 2. Clear a wide board.
  if (enemy.board.length >= 3) {
    const clear = has((c) => c.type === 'spell' && c.effect && c.effect.kind === 'damageAll');
    if (clear) return { type: 'play', handIndex: clear.index, target: null };
  }

  // 3. Heal when hurt.
  if (me.life <= 12) {
    const heal = has((c) => c.type === 'spell' && c.effect && c.effect.kind === 'heal');
    if (heal) return { type: 'play', handIndex: heal.index, target: null };
  }

  // 4. Refill an empty hand.
  if (me.hand.length <= 2) {
    const draw = has((c) => c.type === 'spell' && c.effect && c.effect.kind === 'draw');
    if (draw) return { type: 'play', handIndex: draw.index, target: null };
  }

  // 5. Buff a board worth buffing.
  if (me.board.length >= 2) {
    const buff = has((c) => c.type === 'spell' && c.effect && c.effect.kind === 'buff');
    if (buff) return { type: 'play', handIndex: buff.index, target: null };
  }

  // 6. Finish the game with direct damage.
  const burn = has((c) => c.type === 'spell' && c.effect && c.effect.kind === 'damage' && c.effect.target === 'any' && damageOf(c) >= enemy.life);
  if (burn) return { type: 'play', handIndex: burn.index, target: { kind: 'hero', side: 'you' } };

  // 7. Play the best creature available.
  const creatures = playable.filter((entry) => entry.card.type === 'creature');
  if (creatures.length > 0) {
    creatures.sort((a, b) => handValue(b.card) - handValue(a.card));
    return { type: 'play', handIndex: creatures[0].index, target: null };
  }

  // 8. Spend leftover mana on a useful spell.
  const spell = has((c) => c.type === 'spell' && c.effect && c.effect.kind === 'draw' && me.hand.length < 5)
    || has((c) => c.type === 'spell' && damageOf(c) > 0 && enemy.board.length > 0);
  if (spell) {
    const target = needsTarget(spell.card) ? pickTargetFor(state, spell.card) : null;
    if (!needsTarget(spell.card) || target) return { type: 'play', handIndex: spell.index, target };
  }
  return null;
}

// Choose the best attack Vex can make right now, or null. A creature with
// no good attack rests (its canAttack is spent) so the turn moves on.
function chooseAttack(state) {
  const me = state.foe;
  const enemy = state.you;
  const ready = me.board.filter((c) => c.canAttack);
  if (ready.length === 0) return null;

  const totalAttack = ready.reduce((sum, c) => sum + c.atk, 0);
  if (totalAttack >= enemy.life) {
    const biggest = [...ready].sort((a, b) => b.atk - a.atk)[0];
    return { type: 'attack', attackerUid: biggest.uid, target: { kind: 'hero', side: 'you' } };
  }

  // Best favourable trade: kill an enemy creature and live.
  let best = null;
  for (const attacker of ready) {
    for (const defender of enemy.board) {
      const kills = defender.hp <= attacker.atk;
      const survives = defender.atk < attacker.hp;
      if (!kills) continue;
      const score = defender.atk * 2 + (survives ? 3 : -2) + (attacker.atk >= defender.atk ? 1 : 0);
      if (!best || score > best.score) {
        best = { score, attackerUid: attacker.uid, target: { kind: 'creature', side: 'you', uid: defender.uid } };
      }
    }
  }
  if (best && best.score >= 3) {
    return { type: 'attack', attackerUid: best.attackerUid, target: best.target };
  }

  // No trade worth taking: hit the hero with the strongest ready creature
  // when the board is empty, the creature hits hard, or Vex is ahead.
  const strongest = [...ready].sort((a, b) => b.atk - a.atk)[0];
  const goFace = enemy.board.length === 0 || strongest.atk >= 4 || me.life > enemy.life;
  if (goFace) {
    return { type: 'attack', attackerUid: strongest.uid, target: { kind: 'hero', side: 'you' } };
  }

  for (const creature of ready) creature.canAttack = false;
  return null;
}

// One action for Vex's turn: play first, then attack, then done.
export function nextAction(state) {
  if (state.phase !== 'playing' || state.active !== 'foe') return null;
  return choosePlay(state) || chooseAttack(state);
}
