// «Про Дмитра»: фото ледь рухається при скролі, чеки падають на рейку
export function initAbout() {
  const photo = document.querySelector('.about-photo');
  const rail = document.getElementById('rail');
  if (!photo || !rail) return () => {};

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
    const f = photo.getBoundingClientRect();
    if (f.bottom > 0 && f.top < vh) {
      const k = (f.top + f.height / 2 - vh / 2) / vh;
      photo.style.setProperty('--py', `${(-6 + k * 6).toFixed(2)}%`);
    }
  };
}
