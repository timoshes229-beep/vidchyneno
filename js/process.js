const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Кухонний таймер: скрол крутить стрілку й перемикає етапи
export function initProcess() {
  const section = document.getElementById('process');
  const list = document.getElementById('steps');
  if (!section || !list) return () => {};

  const ticks = document.getElementById('timerTicks');
  const arc = document.getElementById('timerArc');
  const hand = document.getElementById('timerHand');
  const stepEl = document.getElementById('timerStep');
  const whenEl = document.getElementById('timerWhen');

  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const a = (i / 60) * Math.PI * 2;
    const r1 = major ? 168 : 172, r2 = 182;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', 200 + Math.sin(a) * r1);
    l.setAttribute('y1', 200 - Math.cos(a) * r1);
    l.setAttribute('x2', 200 + Math.sin(a) * r2);
    l.setAttribute('y2', 200 - Math.cos(a) * r2);
    if (major) l.classList.add('is-major');
    ticks.appendChild(l);
  }

  // перемикач «є приміщення / ще шукаємо» додає або прибирає етап пошуку
  const group = section.querySelector('.premises');
  const all = [...list.querySelectorAll('.step')];
  let steps = [];
  function setMode(mode) {
    group.dataset.mode = mode;
    for (const b of group.querySelectorAll('.premises-btn')) {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    for (const s of all) s.classList.toggle('is-hidden', mode === 'have' && s.classList.contains('step-search'));
    steps = all.filter((s) => !s.classList.contains('is-hidden'));
    current = -1;
  }
  let current = -1;
  group.addEventListener('click', (e) => {
    const b = e.target.closest('.premises-btn');
    if (b) setMode(b.dataset.mode);
  });
  setMode('have');

  let shown = 0;
  return function update() {
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp(-r.top / (section.offsetHeight - innerHeight));
    shown += (p - shown) * 0.18;

    arc.style.strokeDashoffset = String(100 - shown * 100);
    hand.setAttribute('transform', `rotate(${(shown * 360).toFixed(2)} 200 200)`);

    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
    if (idx !== current) {
      current = idx;
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === idx);
        s.classList.toggle('is-done', i < idx);
      });
      for (const s of all) if (s.classList.contains('is-hidden')) s.classList.remove('is-active', 'is-done');
      stepEl.textContent = String(idx + 1).padStart(2, '0');
      whenEl.textContent = steps[idx].dataset.when;
    }
  };
}
