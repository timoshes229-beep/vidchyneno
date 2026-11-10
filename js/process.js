// Кухонний таймер: натискаєте на етап, стрілка доїжджає до потрібного часу
export function initProcess() {
  const section = document.getElementById('process');
  const list = document.getElementById('steps');
  if (!section || !list) return;

  const ticks = document.getElementById('timerTicks');
  const arc = document.getElementById('timerArc');
  const hand = document.getElementById('timerHand');
  const stepEl = document.getElementById('timerStep');
  const whenEl = document.getElementById('timerWhen');
  const next = document.getElementById('stepNext');

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

  const all = [...list.querySelectorAll('.step')];
  let steps = [];
  let current = 0;

  function show(idx) {
    current = Math.max(0, Math.min(steps.length - 1, idx));
    const share = (current + 1) / steps.length;
    hand.style.setProperty('--deg', `${share * 360}deg`);
    arc.style.strokeDashoffset = String(100 - share * 100);
    for (const s of all) s.classList.remove('is-active', 'is-done');
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === current);
      s.classList.toggle('is-done', i < current);
      s.querySelector('.step-btn').setAttribute('aria-pressed', String(i === current));
    });
    stepEl.textContent = String(current + 1).padStart(2, '0');
    whenEl.textContent = steps[current].dataset.when;
    next.querySelector('span').textContent = current === steps.length - 1 ? 'Спочатку' : 'Далі';
  }

  list.addEventListener('click', (e) => {
    const li = e.target.closest('.step');
    if (li && steps.includes(li)) show(steps.indexOf(li));
  });
  next.addEventListener('click', () => show(current === steps.length - 1 ? 0 : current + 1));

  // перемикач «є приміщення / ще шукаємо» додає або прибирає етап пошуку
  const group = section.querySelector('.premises');
  function setMode(mode) {
    const active = steps[current];
    group.dataset.mode = mode;
    for (const b of group.querySelectorAll('.premises-btn')) {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    for (const s of all) s.classList.toggle('is-hidden', mode === 'have' && s.classList.contains('step-search'));
    steps = all.filter((s) => !s.classList.contains('is-hidden'));
    show(steps.includes(active) ? steps.indexOf(active) : Math.min(current, steps.length - 1));
  }
  group.addEventListener('click', (e) => {
    const b = e.target.closest('.premises-btn');
    if (b) setMode(b.dataset.mode);
  });
  setMode('have');
}
