// «Як ми працюємо»: етапи в мініатюрах гортаються самі, щойно блок у кадрі
const STEP_MS = 3000;
const LAST_MS = 4200;

export function initProcess() {
  const section = document.getElementById('process');
  const dots = [...document.querySelectorAll('.stage-dot')];
  if (!section || !dots.length) return;
  const pics = [...document.querySelectorAll('#stagePics img')];
  const track = document.getElementById('stageTrack');
  const box = document.getElementById('stageText');
  const when = document.getElementById('stageWhen');
  const num = document.getElementById('stageNum');
  const title = document.getElementById('stageTitle');
  const body = document.getElementById('stageBody');

  let current = 0;
  let playing = true;
  let timer;

  function show(i) {
    current = i;
    pics.forEach((p, j) => p.classList.toggle('is-on', j === i));
    dots.forEach((d, j) => {
      d.classList.toggle('is-done', j <= i);
      d.classList.toggle('is-on', j === i);
      d.setAttribute('aria-current', j === i ? 'step' : 'false');
    });
    // помаранчева лінія доходить до поточної точки
    const a = dots[0].getBoundingClientRect();
    const b = dots[i].getBoundingClientRect();
    track.style.setProperty('--fill', `${b.left - a.left}px`);

    const d = dots[i].dataset;
    box.classList.add('is-out');
    setTimeout(() => {
      when.textContent = d.when;
      num.textContent = String(i + 1).padStart(2, '0');
      title.textContent = d.title;
      body.textContent = d.text;
      box.classList.remove('is-out');
    }, 220);
  }

  function tick() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!playing) return;
      show((current + 1) % dots.length);
      tick();
    }, current === dots.length - 1 ? LAST_MS : STEP_MS);
  }

  // клік по етапу зупиняє автопоказ
  dots.forEach((d, i) => d.addEventListener('click', () => { playing = false; clearTimeout(timer); show(i); }));

  // щоразу, коли людина заходить у блок, показ починається з першого етапу
  let fresh = true;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { fresh = true; clearTimeout(timer); return; }
    if (e.intersectionRatio >= 0.45 && fresh) {
      fresh = false;
      playing = true;
      show(0);
      tick();
    }
  }, { threshold: [0, 0.45] }).observe(section.querySelector('.stages'));

  addEventListener('resize', () => show(current));
  show(0);
}
