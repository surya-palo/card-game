// Emberfall's sound: every effect is synthesized live with WebAudio —
// oscillators and filtered noise, no audio files, nothing fetched. The
// context starts on the first user gesture, as browsers require.

let ctx = null;
let enabled = true;
let master = null;

function ensureContext() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

function tone(freq, dur, type, vol, when, slideTo) {
  if (!ctx) return;
  const t0 = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, vol, when, filterFreq) {
  if (!ctx) return;
  const t0 = ctx.currentTime + (when || 0);
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq || 1800;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.value = vol || 0.25;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

const SCORES = {
  click() { tone(660, 0.06, 'triangle', 0.12); },
  deal() { noise(0.12, 0.18, 0, 2400); },
  play() { noise(0.08, 0.3, 0, 1200); tone(180, 0.12, 'sine', 0.3, 0, 90); },
  draw() { noise(0.1, 0.15, 0, 3200); },
  attack() { tone(140, 0.16, 'sawtooth', 0.22, 0, 60); noise(0.1, 0.2, 0, 700); },
  damage() { tone(220, 0.18, 'square', 0.14, 0, 110); },
  heal() { tone(523, 0.14, 'sine', 0.18); tone(659, 0.14, 'sine', 0.18, 0.09); tone(784, 0.22, 'sine', 0.18, 0.18); },
  windfall() { tone(880, 0.1, 'triangle', 0.16); tone(1174, 0.16, 'triangle', 0.16, 0.08); },
  turn() { tone(392, 0.1, 'triangle', 0.14); tone(523, 0.14, 'triangle', 0.14, 0.08); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.32, 'triangle', 0.22, i * 0.13));
    tone(1318, 0.6, 'triangle', 0.2, 0.55);
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.34, 'sine', 0.2, i * 0.16));
  },
};

export const sfx = {
  unlock() { ensureContext(); },
  play(name) {
    if (!enabled) return;
    if (!ensureContext()) return;
    const fn = SCORES[name];
    if (fn) fn();
  },
  setEnabled(on) { enabled = on; },
  isEnabled() { return enabled; },
};
