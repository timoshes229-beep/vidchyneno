import { createHero } from './hero.js?v=202611141054';
import { initAbout } from './about.js?v=202611141054';
import { initProcess } from './process.js?v=202611141054';
import { initCases } from './cases.js?v=202611141054';
import { initPricing } from './pricing.js?v=202611141054';
import { initOrder } from './order.js?v=202611141054';
import { initAudience, initFormats, initFranchise } from './audience.js?v=202611141054';
import { initFaq } from './faq.js?v=202611141054';
import { initContact } from './contact.js?v=202611141054';
import { initPlace } from './place.js?v=202611141054';

const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- плавний скрол ---------- */
const lenis = window.Lenis && !reduceMotion ? new window.Lenis({ lerp: 0.085, prevent: (node) => !!node.closest?.('.iti__dropdown-content, .iti__country-list, .chat-feed') }) : null;
lenis?.stop();


/* ---------- 3D-сцена ---------- */
const heroEl = $('#hero');
const copy = $('#heroCopy');
const veil = $('#heroVeil');
const canvasEl = $('#scene');
const header = $('#header');
const lightSections = [...document.querySelectorAll('.pricing, .faq')];
let hero = null;

const heroReady = createHero(canvasEl)
  .then((h) => {
    hero = h;
    h.onLayout(({ left, right, mid, bottom }) => {
      const s = heroEl.style;
      s.setProperty('--door-l', `${left.toFixed(1)}px`);
      s.setProperty('--door-r', `${right.toFixed(1)}px`);
      s.setProperty('--door-mid', `${mid.toFixed(1)}px`);
      s.setProperty('--door-bottom', `${bottom.toFixed(1)}px`);
    });
    h.onHover((on) => {
      canvasEl.style.cursor = on ? 'pointer' : '';
      cursor.classList.toggle('is-sign', on);
    });
    h.start();
    initPlace(h);
  })
  .catch((err) => {
    console.warn('WebGL недоступний, показуємо фото', err);
    initPlace(null);
    canvasEl.remove();
  });

/* ---------- прелоадер: лічильник, поворот ключа, світло ---------- */
const loader = $('#loader');
const countEl = $('#loaderCount');
const loadStart = performance.now();
const minTime = reduceMotion ? 200 : 1700;
let loaded = false;
let opened = false;
heroReady.finally(() => { loaded = true; });
// якщо 3D вантажиться надто довго, відкриваємо сайт з фото фасаду
setTimeout(() => { loaded = true; }, 6000);

function tickLoader() {
  if (opened) return;
  const byTime = ((performance.now() - loadStart) / minTime) * 100;
  const shown = Math.min(loaded ? 100 : 88, byTime);
  countEl.textContent = Math.floor(shown);
  if (shown >= 100) openUp();
  else setTimeout(tickLoader, 30);
}
tickLoader();

function openUp() {
  opened = true;
  loader.classList.add('is-turning');
  setTimeout(() => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    hero?.lightsOn();
    lenis?.start();
  }, reduceMotion ? 0 : 750);
  setTimeout(() => loader.remove(), 2400);
}

/* ---------- прогрес скролу першого екрана ---------- */
let heroVisible = true;
const tgFloat = $('.tg-float');
const contactEl = $('#contact');
function updateHero() {
  const rect = heroEl.getBoundingClientRect();
  const total = heroEl.offsetHeight - innerHeight;
  const p = clamp(-rect.top / total);
  hero?.setProgress(p);

  const fade = smooth(0, 0.12, p);
  copy.style.opacity = String(1 - fade);
  copy.style.transform = `translate3d(0, ${-fade * 60}px, 0) scale(${1 + fade * 0.04})`;
  veil.style.opacity = String(smooth(0.86, 0.995, p));

  const overLight = lightSections.some((el) => { const r = el.getBoundingClientRect(); return r.top < 40 && r.bottom > 40; });
  header.classList.toggle('is-light', overLight && !menu.classList.contains('is-open'));

  // кнопка Telegram з'являється після першого екрана й ховається біля форми заявки
  const c = contactEl.getBoundingClientRect();
  tgFloat?.classList.toggle('is-on', rect.bottom < innerHeight * 0.5 && c.top > innerHeight * 0.85 && !menu.classList.contains('is-open'));

  const visible = rect.bottom > 0;
  if (visible !== heroVisible) {
    heroVisible = visible;
    visible ? hero?.resume() : hero?.pause();
  }
}

const updateAbout = initAbout();
initProcess();
const updateCases = initCases();
initPricing();
initOrder(!reduceMotion);
initAudience();
initFormats();
initFranchise();
initFaq();
initContact();

function raf(t) {
  lenis?.raf(t);
  updateHero();
  updateAbout();
  updateCases();
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* ---------- меню ---------- */
const menu = $('#menu');
const toggle = $('#menuToggle');
let menuTimer;
function setMenu(open) {
  clearTimeout(menuTimer);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.menu-toggle-text').textContent = open ? 'Закрити' : 'Меню';
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    lenis?.stop();
  } else {
    menu.classList.remove('is-open');
    menuTimer = setTimeout(() => { menu.hidden = true; }, 900);
    lenis?.start();
  }
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const el = id === '#top' ? document.body : document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  setMenu(false);
  lenis ? lenis.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' });
});

/* ---------- курсор і магнітні кнопки ---------- */
const cursor = $('#cursor');
if (finePointer && !reduceMotion) {
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    cursor.classList.add('is-visible');
    cursor.classList.toggle('is-link', !!e.target.closest('a, button'));
  });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  (function loop() {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  })();

  for (const el of document.querySelectorAll('.magnetic')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px) rotate(${dx * 0.02}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
}
