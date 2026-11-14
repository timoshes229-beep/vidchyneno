// «Яка вивіска про вас?»: вивіска вмикається, а вибір переходить у заявку
export function initAudience() {
  const cards = [...document.querySelectorAll('.neon-card')];
  if (!cards.length) return;
  let current = null;
  const light = (card) => {
    if (card === current) return;
    current = card;
    for (const c of cards) c.classList.toggle('is-on', c === card);
  };

  for (const card of cards) {
    card.addEventListener('mouseenter', () => light(card));
    card.addEventListener('click', () => light(card));
    card.addEventListener('focus', () => light(card));
    card.querySelector('.neon-cta').addEventListener('click', (e) => {
      const comment = document.getElementById('booking')?.elements.comment;
      if (comment && !comment.dataset.touched) comment.value = e.currentTarget.dataset.intent;
    });
  }

  // На телефоні наведення немає: світиться вивіска, що проходить посередині екрана
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) light(e.target);
    }, { rootMargin: '-45% 0px -45% 0px' });
    for (const c of cards) io.observe(c);
  }
}

// Вибір переходить у заявку: формат у список, побажання в коментар, якщо людина ще нічого не писала
function toBooking({ format, intent }) {
  const form = document.getElementById('booking');
  if (!form) return;
  if (format) form.elements.format.value = format;
  const comment = form.elements.comment;
  if (intent && comment && !comment.dataset.touched) comment.value = intent;
}

// «Які заклади відчиняємо»
export function initFormats() {
  for (const card of document.querySelectorAll('.fmt-card, .fmt-chip')) {
    card.addEventListener('click', () => toBooking(card.dataset));
  }
}

// «Франшиза чи свій заклад?»: табличка перевертається
export function initFranchise() {
  const section = document.getElementById('franchise');
  const flip = document.getElementById('frFlip');
  if (!section || !flip) return;
  flip.addEventListener('click', () => {
    const own = section.classList.toggle('is-own');
    flip.setAttribute('aria-pressed', String(own));
  });
  section.querySelector('.fr-cta')?.addEventListener('click', (e) => toBooking(e.currentTarget.dataset));
}
