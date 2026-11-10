// «Ваше замовлення»: послуги додаються в кухонний чек і переходять у заявку
const plural = (n) => {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return 'позиція';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'позиції';
  return 'позицій';
};

export function initOrder(animate) {
  const groups = document.getElementById('orderGroups');
  if (!groups) return;
  const items = [...groups.querySelectorAll('.svc')];
  const modes = [...document.querySelectorAll('.order-mode')];
  const list = document.getElementById('ktList');
  const count = document.getElementById('ktCount');
  const empty = document.getElementById('ktEmpty');
  const total = document.getElementById('ktTotal');
  const stamp = document.getElementById('ktStamp');
  const cta = document.getElementById('ktCta');

  function render(fresh = new Set()) {
    const on = items.filter((i) => i.classList.contains('is-on'));
    const all = on.length === items.length;
    list.innerHTML = '';
    for (const i of on) {
      const li = document.createElement('li');
      li.textContent = i.querySelector('b').textContent;
      if (fresh.has(i)) li.classList.add('is-new');
      list.appendChild(li);
    }
    count.textContent = `${on.length} ${plural(on.length)}`;
    empty.hidden = on.length > 0;
    total.hidden = on.length === 0;
    total.textContent = all ? 'Під ключ від $2 800' : 'Окремі послуги рахуємо індивідуально';
    stamp.classList.toggle('is-hidden', !all);
    for (const m of modes) {
      const active = m.dataset.mode === (all ? 'all' : 'none');
      m.classList.toggle('is-active', active);
      m.setAttribute('aria-pressed', String(active));
    }
    for (const i of items) i.setAttribute('aria-pressed', String(i.classList.contains('is-on')));
  }

  // назва послуги «летить» у чек, якщо чек видно на екрані
  function fly(item) {
    if (!animate) return;
    const to = list.getBoundingClientRect();
    if (to.top > innerHeight || to.bottom < 0) return;
    const from = item.querySelector('b').getBoundingClientRect();
    const tag = document.createElement('span');
    tag.className = 'svc-fly';
    tag.textContent = item.querySelector('b').textContent;
    tag.style.left = `${from.left}px`;
    tag.style.top = `${from.top}px`;
    document.body.appendChild(tag);
    const dx = to.left - from.left, dy = to.bottom - from.top - 20;
    tag.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(.9)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0 },
    ], { duration: 750, easing: 'cubic-bezier(.5, 0, .3, 1)' }).onfinish = () => tag.remove();
  }

  groups.addEventListener('click', (e) => {
    const item = e.target.closest('.svc');
    if (!item) return;
    const on = item.classList.toggle('is-on');
    if (on) fly(item);
    render(on ? new Set([item]) : undefined);
  });
  for (const m of modes) {
    m.addEventListener('click', () => {
      const all = m.dataset.mode === 'all';
      const fresh = new Set(items.filter((i) => all && !i.classList.contains('is-on')));
      for (const i of items) i.classList.toggle('is-on', all);
      render(fresh);
    });
  }

  // вибір переходить у коментар заявки
  cta.addEventListener('click', () => {
    const comment = document.getElementById('booking')?.elements.comment;
    if (!comment || comment.dataset.touched) return;
    const on = items.filter((i) => i.classList.contains('is-on')).map((i) => i.querySelector('b').textContent);
    comment.value = on.length === items.length ? 'Цікавить запуск під ключ.' : on.length ? `Цікавить: ${on.join(', ')}.` : '';
  });
  document.getElementById('booking')?.elements.comment?.addEventListener('input', (e) => { e.target.dataset.touched = '1'; });

  render();
}
