// Emberfall's card catalogue: the four Winds and the 24 cards of the duel
// deck. Every card is an original design for this game. A Wind is told apart
// by colour AND by its glyph shape, never by text alone.
//
// Effect shapes (spells and battlecries):
//   { kind: 'damage', amount, target: 'any' }        pick any creature or hero
//   { kind: 'damage', amount, target: 'creature' }   pick a creature
//   { kind: 'damageAll', amount, hero: n }           all enemy creatures, plus hero
//   { kind: 'heal', amount }                         restore your Life
//   { kind: 'draw', amount }                         draw cards
//   { kind: 'buff', hp: n }                          your creatures gain Health
//   { kind: 'damageHeal', amount, heal }             damage a creature, heal you

export const WINDS = {
  ember: { key: 'ember', name: 'Ember', color: '#e2483d', dark: '#7e1d16', glyph: 'flame', motto: 'Burn bright.' },
  tide: { key: 'tide', name: 'Tide', color: '#2f7fd0', dark: '#123f6e', glyph: 'drop', motto: 'Flow returns.' },
  thorn: { key: 'thorn', name: 'Thorn', color: '#3da35d', dark: '#14532a', glyph: 'leaf', motto: 'Roots hold.' },
  storm: { key: 'storm', name: 'Storm', color: '#e8a91c', dark: '#7a5200', glyph: 'bolt', motto: 'Strike first.' },
};

export const WIND_KEYS = ['ember', 'tide', 'thorn', 'storm'];

export const CARDS = [
  // --- Ember: fast damage, fragile bodies ---
  { id: 'ember-imp', name: 'Ember Imp', wind: 'ember', type: 'creature', cost: 1, atk: 2, hp: 1, text: '' },
  { id: 'cinder-wolf', name: 'Cinder Wolf', wind: 'ember', type: 'creature', cost: 2, atk: 3, hp: 2, text: '' },
  { id: 'flame-lash', name: 'Flame Lash', wind: 'ember', type: 'spell', cost: 2, text: 'Deal 3 damage.', effect: { kind: 'damage', amount: 3, target: 'any' } },
  { id: 'ember-drake', name: 'Ember Drake', wind: 'ember', type: 'creature', cost: 4, atk: 5, hp: 4, text: '' },
  { id: 'wildfire', name: 'Wildfire', wind: 'ember', type: 'spell', cost: 5, text: 'Deal 2 damage to all enemy creatures.', effect: { kind: 'damageAll', amount: 2, hero: 0 } },
  { id: 'inferno-phoenix', name: 'Inferno Phoenix', wind: 'ember', type: 'creature', cost: 6, atk: 7, hp: 6, text: '' },

  // --- Tide: card flow and healing ---
  { id: 'tide-sprite', name: 'Tide Sprite', wind: 'tide', type: 'creature', cost: 1, atk: 1, hp: 3, text: '' },
  { id: 'coral-guard', name: 'Coral Guard', wind: 'tide', type: 'creature', cost: 2, atk: 2, hp: 4, text: '' },
  { id: 'healing-current', name: 'Healing Current', wind: 'tide', type: 'spell', cost: 2, text: 'Restore 6 Life.', effect: { kind: 'heal', amount: 6 } },
  { id: 'deep-oracle', name: 'Deep Oracle', wind: 'tide', type: 'creature', cost: 3, atk: 2, hp: 4, text: 'Draw a card.', battlecry: { kind: 'draw', amount: 1 } },
  { id: 'tidal-surge', name: 'Tidal Surge', wind: 'tide', type: 'spell', cost: 4, text: 'Draw 2 cards.', effect: { kind: 'draw', amount: 2 } },
  { id: 'leviathan', name: 'Leviathan', wind: 'tide', type: 'creature', cost: 7, atk: 8, hp: 8, text: '' },

  // --- Thorn: tough bodies and staying power ---
  { id: 'thorn-sprout', name: 'Thorn Sprout', wind: 'thorn', type: 'creature', cost: 1, atk: 1, hp: 2, text: '' },
  { id: 'bramble-bear', name: 'Bramble Bear', wind: 'thorn', type: 'creature', cost: 3, atk: 3, hp: 5, text: '' },
  { id: 'root-snare', name: 'Root Snare', wind: 'thorn', type: 'spell', cost: 2, text: 'Deal 3 damage to a creature. Restore 3 Life.', effect: { kind: 'damageHeal', amount: 3, heal: 3, target: 'creature' } },
  { id: 'oakwarden', name: 'Oakwarden', wind: 'thorn', type: 'creature', cost: 4, atk: 4, hp: 6, text: '' },
  { id: 'groves-blessing', name: "Grove's Blessing", wind: 'thorn', type: 'spell', cost: 3, text: 'Your creatures gain +2 Health.', effect: { kind: 'buff', hp: 2 } },
  { id: 'ancient-treant', name: 'Ancient Treant', wind: 'thorn', type: 'creature', cost: 6, atk: 6, hp: 8, text: '' },

  // --- Storm: removal and burst ---
  { id: 'spark-bat', name: 'Spark Bat', wind: 'storm', type: 'creature', cost: 1, atk: 2, hp: 1, text: '' },
  { id: 'static-jolt', name: 'Static Jolt', wind: 'storm', type: 'spell', cost: 1, text: 'Deal 2 damage.', effect: { kind: 'damage', amount: 2, target: 'any' } },
  { id: 'gale-rider', name: 'Gale Rider', wind: 'storm', type: 'creature', cost: 3, atk: 4, hp: 3, text: '' },
  { id: 'chain-lightning', name: 'Chain Lightning', wind: 'storm', type: 'spell', cost: 4, text: 'Deal 5 damage to a creature.', effect: { kind: 'damage', amount: 5, target: 'creature' } },
  { id: 'stormcaller', name: 'Stormcaller', wind: 'storm', type: 'creature', cost: 5, atk: 6, hp: 5, text: '' },
  { id: 'tempest', name: 'Tempest', wind: 'storm', type: 'spell', cost: 6, text: 'Deal 3 damage to all enemy creatures and 2 to the enemy hero.', effect: { kind: 'damageAll', amount: 3, hero: 2 } },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id) || null;
}

// A fresh deck: one of each card, as new instances the engine can mutate.
export function buildDeck() {
  return CARDS.map((def) => ({ ...def }));
}
