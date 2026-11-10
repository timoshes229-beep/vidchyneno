import { createBuild3D } from './process3d.js';

// «Як ми працюємо»: заклад будується етап за етапом, сам або по кліку
const STEP_MS = 3200;
const HOLD_MS = 5000;

export function initProcess() {
  const svg = document.getElementById('buildSvg');
  const list = document.getElementById('buildSteps');
  if (!svg || !list) return;

  const art = svg.closest('.build-art');
  const layers = [...svg.querySelectorAll('.b-step')];
  const buttons = [...list.querySelectorAll('.build-step')];
  const when = document.getElementById('buildWhen');
  const name = document.getElementById('buildName');
  const text = document.getElementById('buildText');
  const prev = document.getElementById('buildPrev');
  const next = document.getElementById('buildNext');
  let current = -1;
  let model = null;

  function show(i) {
    i = Math.max(0, Math.min(buttons.length - 1, i));
    current = i;
    layers.forEach((l) => l.classList.toggle('is-on', Number(l.dataset.step) <= i + 1));
    svg.classList.toggle('is-inked', i >= 3);
    model?.setStage(i + 1);
    buttons.forEach((b, k) => {
      b.classList.toggle('is-active', k === i);
      b.classList.toggle('is-done', k < i);
      b.setAttribute('aria-pressed', String(k === i));
    });
    // перезапуск смужки-таймера на активному етапі
    list.classList.remove('is-playing');
    if (playing) { void list.offsetWidth; list.classList.add('is-playing'); }
    list.style.setProperty('--progress', `${((i + 1) / buttons.length) * 100}%`);
    const b = buttons[i];
    when.textContent = b.dataset.when;
    name.textContent = b.lastChild.textContent.trim();
    text.textContent = b.dataset.text;
    prev.disabled = i === 0;
    next.querySelector('span').textContent = i === buttons.length - 1 ? 'Спочатку' : 'Далі';
  }

  function reset() {
    layers.forEach((l) => l.classList.remove('is-on'));
    model?.setStage(0);
  }

  /* автопоказ: іде сам, поки людина не натисне */
  let playing = true, timer = 0, visible = false;
  list.style.setProperty('--step-ms', `${STEP_MS}ms`);
  function tick() {
    clearTimeout(timer);
    if (!playing || !visible) return;
    const last = current === buttons.length - 1;
    timer = setTimeout(() => {
      if (last) { reset(); setTimeout(() => show(0), 700); timer = setTimeout(tick, 700); return; }
      show(current + 1);
      tick();
    }, last ? HOLD_MS : STEP_MS);
  }
  function takeOver() {
    playing = false;
    clearTimeout(timer);
    list.classList.remove('is-playing');
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('.build-step');
    if (!b) return;
    takeOver();
    show(buttons.indexOf(b));
  });
  prev.addEventListener('click', () => { takeOver(); show(current - 1); });
  next.addEventListener('click', () => {
    takeOver();
    if (current === buttons.length - 1) { reset(); requestAnimationFrame(() => show(0)); }
    else show(current + 1);
  });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      model?.start();
      if (current < 0) show(0);
      tick();
    } else {
      model?.stop();
      clearTimeout(timer);
    }
  }, { threshold: 0.3 }).observe(art);

  // 3D-макет; якщо WebGL недоступний, лишається плаский ескіз
  const canvas = document.getElementById('build3d');
  if (canvas) {
    createBuild3D(canvas).then((m) => {
      model = m;
      art.classList.add('has-3d');
      dispatchEvent(new Event('resize'));
      const saved = (() => { try { return JSON.parse(localStorage.getItem('vidchyneno-place') || '{}').name; } catch { return ''; } })();
      if (saved) m.setName(saved);
      addEventListener('place:change', (e) => m.setName(e.detail.name));
      if (current >= 0) m.setStage(current + 1);
      if (visible) m.start();
    }).catch((err) => console.warn('3D-макет недоступний, показуємо ескіз', err));
  }
}
