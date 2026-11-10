// Звуки синтезуються в браузері, без файлів. Вмикаються лише кнопкою «Звук».
let ctx = null;
let on = false;

function ensure() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, { type = 'sine', gain = 0.15, delay = 0, attack = 0.005 } = {}) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { freq = 2000, q = 1, gain = 0.3, delay = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

const play = (fn) => () => { if (!on) return; try { ensure(); fn(); } catch { /* звук не критичний */ } };

export const sfx = {
  // клацання ключа в замку
  key: play(() => { noise(0.05, { freq: 3200, q: 3, gain: 0.5 }); noise(0.07, { freq: 1800, q: 2, gain: 0.45, delay: 0.13 }); }),
  // дзвіночок над дверима
  bell: play(() => {
    for (const [f, g] of [[1318, 0.12], [1975, 0.07], [2637, 0.035]]) tone(f, 1.6, { gain: g });
    for (const [f, g] of [[1480, 0.08], [2217, 0.04]]) tone(f, 1.3, { gain: g, delay: 0.16 });
  }),
  // кухонний принтер чеків
  printer: play(() => {
    for (let i = 0; i < 16; i++) noise(0.025, { freq: 2600 + (i % 2) * 700, q: 4, gain: 0.35, delay: i * 0.05 });
    tone(80, 0.9, { type: 'square', gain: 0.02 });
  }),
  // табличка перевертається
  flip: play(() => { tone(140, 0.18, { gain: 0.18 }); noise(0.06, { freq: 900, gain: 0.2 }); }),
};

export function initSound() {
  try { on = localStorage.getItem('vidchyneno-sound') === 'on'; } catch { on = false; }
  const actions = document.querySelector('.header-actions');
  const menuBtn = document.getElementById('menuToggle');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  btn.innerHTML = '<span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="sound-text">Звук</span>';
  const sync = () => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Вимкнути звук' : 'Увімкнути звук');
    btn.classList.toggle('is-on', on);
  };
  btn.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem('vidchyneno-sound', on ? 'on' : 'off'); } catch { /* не критично */ }
    sync();
    if (on) { ensure(); sfx.bell(); }
  });
  actions.insertBefore(btn, menuBtn);
  sync();
  return sfx;
}
