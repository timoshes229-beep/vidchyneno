// «Як ми працюємо»: креслення закладу добудовується з кожним етапом
export function initProcess() {
  const svg = document.getElementById('buildSvg');
  const list = document.getElementById('buildSteps');
  if (!svg || !list) return;

  const layers = [...svg.querySelectorAll('.b-step')];
  const buttons = [...list.querySelectorAll('.build-step')];
  const when = document.getElementById('buildWhen');
  const name = document.getElementById('buildName');
  const text = document.getElementById('buildText');
  const prev = document.getElementById('buildPrev');
  const next = document.getElementById('buildNext');
  let current = -1;

  function show(i) {
    i = Math.max(0, Math.min(buttons.length - 1, i));
    if (i === current) return;
    current = i;
    layers.forEach((l) => l.classList.toggle('is-on', Number(l.dataset.step) <= i + 1));
    svg.classList.toggle('is-inked', i >= 3);
    buttons.forEach((b, k) => {
      b.classList.toggle('is-active', k === i);
      b.classList.toggle('is-done', k < i);
      b.setAttribute('aria-pressed', String(k === i));
    });
    list.style.setProperty('--progress', `${((i + 1) / buttons.length) * 100}%`);
    const b = buttons[i];
    when.textContent = b.dataset.when;
    name.textContent = b.lastChild.textContent.trim();
    text.textContent = b.dataset.text;
    prev.disabled = i === 0;
    next.querySelector('span').textContent = i === buttons.length - 1 ? 'Спочатку' : 'Далі';
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('.build-step');
    if (b) show(buttons.indexOf(b));
  });
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => {
    if (current === buttons.length - 1) { current = -1; layers.forEach((l) => l.classList.remove('is-on')); requestAnimationFrame(() => show(0)); }
    else show(current + 1);
  });

  // перший штрих малюється, коли блок з'являється на екрані
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    show(0);
    io.disconnect();
  }, { threshold: 0.35 }).observe(svg);
}
