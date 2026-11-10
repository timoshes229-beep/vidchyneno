const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Вечірня вулиця: вертикальний скрол рухає фасади вбік, на кожному вмикається світло
export function initCases() {
  const section = document.getElementById('cases');
  const track = document.getElementById('casesTrack');
  if (!section || !track) return () => {};

  const cards = [...track.querySelectorAll('.case')];
  const real = cards.filter((c) => !c.classList.contains('case-yours'));
  const lit = cards.map(() => 0);
  const nowEl = document.getElementById('casesNow');
  document.getElementById('casesAll').textContent = String(real.length).padStart(2, '0');

  let distance = 0;
  function measure() {
    distance = Math.max(0, track.scrollWidth - innerWidth);
    section.style.height = `${distance + innerHeight * 1.15}px`;
  }
  measure();
  addEventListener('resize', measure);
  for (const img of track.querySelectorAll('img')) img.addEventListener('load', measure, { once: true });

  let x = 0, shownNow = -1;
  return function update() {
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp(-r.top / (section.offsetHeight - innerHeight));
    x += (p * distance - x) * 0.16;
    track.style.transform = `translate3d(${-x.toFixed(1)}px, 0, 0)`;

    const vw = innerWidth;
    let nearest = 0, best = Infinity;
    cards.forEach((c, i) => {
      const b = c.getBoundingClientRect();
      const center = b.left + b.width / 2;
      const off = (center - vw / 2) / vw;
      // світло вмикається, коли фасад підходить до центру, і вже не гасне
      lit[i] = Math.max(lit[i], clamp(1.25 - Math.abs(off) * 2.6));
      c.style.setProperty('--lit', lit[i].toFixed(3));
      c.style.setProperty('--px', `${(-6 - off * 6).toFixed(2)}%`);
      if (real.includes(c) && Math.abs(off) < best) { best = Math.abs(off); nearest = real.indexOf(c); }
    });
    if (nearest !== shownNow) {
      shownNow = nearest;
      nowEl.textContent = String(nearest + 1).padStart(2, '0');
    }
  };
}
