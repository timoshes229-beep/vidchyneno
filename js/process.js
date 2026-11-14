// «Як ми працюємо»: блок прилипає до екрана, а етапи змінюються, поки людина гортає
export function initProcess(lenis) {
  const section = document.getElementById('process');
  const dots = [...document.querySelectorAll('.stage-dot')];
  if (!section || !dots.length) return () => {};
  const pics = [...document.querySelectorAll('#stagePics img')];
  const track = document.getElementById('stageTrack');
  const box = document.getElementById('stageText');
  const when = document.getElementById('stageWhen');
  const num = document.getElementById('stageNum');
  const title = document.getElementById('stageTitle');
  const body = document.getElementById('stageBody');
  const total = String(dots.length).padStart(2, '0');

  let current = -1;
  let swap;

  function fill(i) {
    const a = dots[0].getBoundingClientRect();
    const b = dots[i].getBoundingClientRect();
    track.style.setProperty('--fill', `${b.left - a.left}px`);
  }

  function show(i) {
    if (i === current) return;
    current = i;
    pics.forEach((p, j) => p.classList.toggle('is-on', j === i));
    dots.forEach((d, j) => {
      d.classList.toggle('is-done', j <= i);
      d.classList.toggle('is-on', j === i);
      d.setAttribute('aria-current', j === i ? 'step' : 'false');
    });
    fill(i);

    const d = dots[i].dataset;
    box.classList.add('is-out');
    clearTimeout(swap);
    swap = setTimeout(() => {
      when.textContent = d.when;
      num.innerHTML = `${String(i + 1).padStart(2, '0')}<span>/ ${total}</span>`;
      title.textContent = d.title;
      body.textContent = d.text;
      box.classList.remove('is-out');
    }, 110);
  }

  // скільки прокручено всередині блоку: від 0 до 1
  const progress = () => {
    const r = section.getBoundingClientRect();
    const run = r.height - innerHeight;
    return run > 0 ? Math.min(Math.max(-r.top / run, 0), 1) : 0;
  };

  // клік по етапу прокручує до місця, де він показується
  dots.forEach((d, i) => d.addEventListener('click', () => {
    const run = section.offsetHeight - innerHeight;
    const top = section.offsetTop + ((i + 0.5) / dots.length) * run;
    if (lenis) lenis.scrollTo(top, { duration: 0.9 });
    else scrollTo({ top, behavior: 'smooth' });
  }));

  addEventListener('resize', () => { if (current >= 0) fill(current); });
  show(0);

  return function update() {
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    show(Math.min(dots.length - 1, Math.floor(progress() * dots.length)));
  };
}
