// Меню запуску: фото страв летить за курсором, картка ледь нахиляється
export function initMenu(interactive) {
  const card = document.getElementById('menuCard');
  const preview = document.getElementById('dishPreview');
  if (!card || !preview || !interactive) return;

  const img = preview.querySelector('img');
  const src = (name) => `assets/photos/${name}.jpg`;
  // підвантажуємо фото заздалегідь, щоб не було порожніх кадрів
  for (const d of card.querySelectorAll('.dish')) new Image().src = src(d.dataset.img);

  let x = 0, y = 0, px = 0, py = 0, rot = 0, active = null;

  card.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty('--ry', `${(nx * 3).toFixed(2)}deg`);
    card.style.setProperty('--rx', `${(-ny * 2.4).toFixed(2)}deg`);

    const dish = e.target.closest('.dish');
    if (dish !== active) {
      active = dish;
      if (dish) {
        img.src = src(dish.dataset.img);
        if (!preview.classList.contains('is-on')) { px = x; py = y; }
      }
      preview.classList.toggle('is-on', !!dish);
    }
  });
  card.addEventListener('pointerleave', () => {
    active = null;
    preview.classList.remove('is-on');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });

  (function loop() {
    const dx = x - px;
    px += dx * 0.14;
    py += (y - py) * 0.14;
    rot += (Math.max(-12, Math.min(12, dx * 0.08)) - rot) * 0.1;
    // фото збоку від курсора, щоб не закривати текст; біля правого краю — ліворуч
    const w = preview.offsetWidth;
    const ox = px > innerWidth - w - 80 ? -w - 36 : 36;
    preview.style.transform = `translate3d(${px + ox}px, ${py - preview.offsetHeight / 2}px, 0) rotate(${rot.toFixed(2)}deg)`;
    requestAnimationFrame(loop);
  })();
}
