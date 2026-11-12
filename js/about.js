// «Про Дмитра»: фото повільно віддаляється, поки блок прокручується
export function initAbout() {
  const section = document.getElementById('about');
  const img = section?.querySelector('.about-photo img');
  if (!img) return () => {};

  return function update() {
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const k = Math.min(Math.max(1 - r.bottom / (innerHeight + r.height), 0), 1);
    img.style.setProperty('--z', (1.06 - k * 0.06).toFixed(3));
  };
}
