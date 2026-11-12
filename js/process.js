import { createBuild3D } from './process3d.js?v=202611122234';
import { place, updatePlace } from './place.js?v=202611122234';

// «Як ми працюємо»: заклад будується етап за етапом, сам або по кліку
const STEP_MS = 1900;
const HOLD_MS = 3500;

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

  // показ стартує з першого етапу щоразу, коли макет видно хоча б наполовину
  let fresh = true;
  new IntersectionObserver((entries) => {
    const e = entries[0];
    if (!e.isIntersecting) {
      visible = false;
      fresh = true;
      model?.stop();
      clearTimeout(timer);
      return;
    }
    model?.start();
    if (e.intersectionRatio >= 0.5 && fresh && !section.classList.contains('is-config')) {
      fresh = false;
      visible = true;
      playing = true;
      clearTimeout(timer);
      reset();
      setTimeout(() => { show(0); tick(); }, 350);
    } else if (current < 0) show(0);
  }, { threshold: [0, 0.5] }).observe(art);

  /* «Зберіть свій заклад»: режим конструктора на тому ж макеті */
  const section = document.getElementById('process');
  const modes = document.getElementById('buildModes');
  const config = document.getElementById('buildConfig');
  const cfgName = document.getElementById('cfgName');
  const choice = { facade: 'brick', awning: '#f26a1b', extras: new Set(['flowers']) };
  const LABELS = {
    format: { restaurant: 'ресторан', coffee: "кав'ярня", pizza: 'піцерія', burger: 'бургерна' },
    facade: { brick: 'цегла', plaster: 'штукатурка', dark: 'темний фасад' },
    extras: { terrace: 'тераса', flowers: 'квіти біля входу', garland: 'гірлянда' },
  };

  function syncConfigUI() {
    cfgName.value = place.name;
    for (const group of config.querySelectorAll('.cfg-options')) {
      const key = group.dataset.cfg;
      for (const b of group.querySelectorAll('button')) {
        const val = b.dataset.value;
        const on = key === 'format' ? val === place.format
          : key === 'extras' ? choice.extras.has(val)
          : choice[key] === val;
        b.classList.toggle('is-active', on);
        if (key === 'extras') b.setAttribute('aria-pressed', String(on));
      }
    }
  }
  function applyModel() {
    if (!model) return;
    model.setFacade(choice.facade);
    model.setAwning(choice.awning);
    model.setExtras({ terrace: choice.extras.has('terrace'), flowers: choice.extras.has('flowers'), garland: choice.extras.has('garland') });
  }

  function setMode(mode) {
    const cfgOn = mode === 'config';
    section.classList.toggle('is-config', cfgOn);
    config.hidden = !cfgOn;
    for (const b of modes.querySelectorAll('.build-mode')) {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    }
    takeOver();
    model?.setBuild(cfgOn);
    if (cfgOn) { syncConfigUI(); applyModel(); model?.setStage(5); }
    else show(Math.max(0, current));
  }
  modes.addEventListener('click', (e) => { const b = e.target.closest('.build-mode'); if (b) setMode(b.dataset.mode); });

  let nameTimer;
  cfgName.addEventListener('input', () => { clearTimeout(nameTimer); nameTimer = setTimeout(() => updatePlace({ name: cfgName.value }), 150); });
  config.addEventListener('click', (e) => {
    const b = e.target.closest('.cfg-options button');
    if (!b) return;
    const key = b.closest('.cfg-options').dataset.cfg;
    const val = b.dataset.value;
    if (key === 'format') updatePlace({ format: val });
    else if (key === 'extras') choice.extras.has(val) ? choice.extras.delete(val) : choice.extras.add(val);
    else choice[key] = val;
    syncConfigUI();
    applyModel();
  });
  addEventListener('place:change', () => { if (!config.hidden) syncConfigUI(); });

  // «Відкрити заклад»: світло вмикається заново, підходить гість
  document.getElementById('cfgOpen').addEventListener('click', () => {
    model?.setStage(5);
    setTimeout(() => model?.setStage(7), 450);
  });
  // «Хочу такий заклад»: конфігурація йде в заявку
  document.getElementById('cfgWant').addEventListener('click', () => {
    const form = document.getElementById('booking');
    if (!form) return;
    const awningName = config.querySelector(`[data-cfg="awning"] [data-value="${choice.awning}"]`)?.getAttribute('aria-label')?.toLowerCase();
    const parts = [
      LABELS.format[place.format],
      LABELS.facade[choice.facade],
      awningName && `${awningName} козирки`,
      ...[...choice.extras].map((x) => LABELS.extras[x]),
    ].filter(Boolean);
    const named = place.name.trim() ? ` «${place.name.trim()}»` : '';
    const comment = form.elements.comment;
    if (!comment.dataset.touched) comment.value = `Хочу такий заклад${named}: ${parts.join(', ')}.`;
  });

  // 3D-макет; якщо WebGL недоступний, лишається плаский ескіз
  const canvas = document.getElementById('build3d');
  if (canvas) new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    createBuild3D(canvas).then((m) => {
      model = m;
      art.classList.add('has-3d');
      dispatchEvent(new Event('resize'));
      const saved = (() => { try { return JSON.parse(localStorage.getItem('vidchyneno-place') || '{}').name; } catch { return ''; } })();
      if (saved) m.setName(saved);
      addEventListener('place:change', (e) => { m.setName(e.detail.name); m.setFormat(e.detail.format); });
      m.setFormat(place.format);
      modes.hidden = false;
      applyModel();
      if (current >= 0) m.setStage(current + 1);
      if (visible) m.start();
    }).catch((err) => console.warn('3D-макет недоступний, показуємо ескіз', err));
  }, { rootMargin: '900px 0px' }).observe(art);
}
