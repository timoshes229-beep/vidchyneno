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

  // етапи як вкладки: відкрита одна група, а чек показує вибір з усіх
  const tabsEl = document.getElementById('orderTabs');
  const panels = [...groups.querySelectorAll('.order-group')];
  const tabs = panels.map((g, i) => {
    const stage = g.querySelector('.order-stage');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'order-tab';
    b.id = `orderTab${i}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', `orderPanel${i}`);
    b.innerHTML = `<span class="order-tab-name">${stage.lastChild.textContent}</span><span class="order-tab-count"></span>`;
    g.id = `orderPanel${i}`;
    g.setAttribute('role', 'tabpanel');
    g.setAttribute('aria-labelledby', b.id);
    b.addEventListener('click', () => openTab(i));
    tabsEl.appendChild(b);
    return b;
  });
  function openTab(n) {
    tabs.forEach((t, i) => {
      t.classList.toggle('is-active', i === n);
      t.setAttribute('aria-selected', String(i === n));
      t.tabIndex = i === n ? 0 : -1;
    });
    panels.forEach((g, i) => { g.hidden = i !== n; });
  }
  tabsEl.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    openTab(n);
    tabs[n].focus();
  });
  openTab(0);

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
    panels.forEach((g, n) => {
      const svc = [...g.querySelectorAll('.svc')];
      const picked = svc.filter((i) => i.classList.contains('is-on')).length;
      tabs[n].querySelector('.order-tab-count').textContent = `${picked}/${svc.length}`;
      tabs[n].classList.toggle('is-empty', picked === 0);
    });
  }

  // назва послуги «летить» у чек, якщо чек видно на екрані
  function fly(item) {
    if (!animate) return;
    // на телефоні список у чеку згорнутий, тож назва летить до лічильника
    const to = (list.offsetParent ? list : count).getBoundingClientRect();
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
    comment.closest('details')?.setAttribute('open', '');
  });
  document.getElementById('booking')?.elements.comment?.addEventListener('input', (e) => { e.target.dataset.touched = '1'; });

  render();
}
