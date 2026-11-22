// Emberfall's motion: floating damage numbers, attack lunges, the card
// that flies from hand to table, and the ember confetti of a win. All of
// it runs on a dedicated effects layer above the table, so a re-render
// never cuts an animation short.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fxLayer() {
  let layer = document.getElementById('fx');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'fx';
    document.body.appendChild(layer);
  }
  return layer;
}

// A number that rises off a point and fades: damage, healing, mana.
export function floatText(x, y, text, kind) {
  const el = document.createElement('div');
  el.className = `floater ${kind || ''}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  fxLayer().appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// The attacker darts at its target and snaps back.
export async function lunge(attackerEl, targetEl) {
  if (!attackerEl || !targetEl) return;
  const from = centerOf(attackerEl);
  const to = centerOf(targetEl);
  const dx = (to.x - from.x) * 0.45;
  const dy = (to.y - from.y) * 0.45;
  attackerEl.style.transition = 'transform 140ms ease-out';
  attackerEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
  await sleep(150);
  attackerEl.style.transition = 'transform 200ms ease-in';
  attackerEl.style.transform = '';
  await sleep(210);
  attackerEl.style.transition = '';
}

// A played card flies from its hand slot to its board slot.
export async function flyCard(fromEl, toX, toY) {
  if (!fromEl) return;
  const from = fromEl.getBoundingClientRect();
  const ghost = fromEl.cloneNode(true);
  ghost.classList.add('flying');
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  fxLayer().appendChild(ghost);
  await sleep(20);
  ghost.style.transform = `translate(${toX - from.left - from.width / 2}px, ${toY - from.top - from.height / 2}px) rotate(0deg) scale(0.82)`;
  await sleep(280);
  ghost.remove();
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 450);
}

// A burst of embers that rains down over the table for a win.
export function emberRain(count) {
  const layer = fxLayer();
  const total = count || 70;
  for (let i = 0; i < total; i += 1) {
    const ember = document.createElement('div');
    ember.className = 'ember-particle';
    ember.style.left = `${Math.random() * 100}vw`;
    ember.style.animationDelay = `${Math.random() * 0.9}s`;
    ember.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    const size = 5 + Math.random() * 7;
    ember.style.width = `${size}px`;
    ember.style.height = `${size}px`;
    const colors = ['#e2483d', '#e8a91c', '#ff7a3d', '#ffd166'];
    ember.style.background = colors[Math.floor(Math.random() * colors.length)];
    layer.appendChild(ember);
    setTimeout(() => ember.remove(), 4200);
  }
}

export { sleep };
