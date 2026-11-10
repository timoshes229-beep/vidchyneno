const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function initAbout() {
  const statement = document.getElementById('aboutStatement');
  const frame = document.querySelector('.about-photo-frame');
  const rail = document.getElementById('rail');
  if (!statement || !frame || !rail) return () => {};

  // слова проявляються по мірі скролу
  const words = statement.textContent.trim().split(/\s+/);
  statement.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
  const spans = [...statement.querySelectorAll('.word')];
  let lit = -1;

  // чеки висять трохи криво, як на справжній кухні
  const tilt = [-2.6, 1.8, -1.2, 2.4, -1.8];
  rail.querySelectorAll('.ticket').forEach((t, i) => {
    t.style.setProperty('--r', `${tilt[i % tilt.length]}deg`);
    t.style.setProperty('--i', i);
  });
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    rail.classList.add('is-in');
    setTimeout(() => rail.classList.add('is-settled'), 1600);
    io.disconnect();
  }, { threshold: 0.3 }).observe(rail);

  return function update() {
    const vh = innerHeight;
    const r = statement.getBoundingClientRect();
    if (r.bottom > -vh && r.top < vh * 2) {
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.35));
      const n = Math.round(p * spans.length);
      if (n !== lit) {
        spans.forEach((s, i) => s.classList.toggle('is-on', i < n));
        lit = n;
      }
    }
    const f = frame.getBoundingClientRect();
    if (f.bottom > 0 && f.top < vh) {
      const k = (f.top + f.height / 2 - vh / 2) / vh;
      frame.style.setProperty('--py', `${(-6 + k * 6).toFixed(2)}%`);
    }
  };
}
