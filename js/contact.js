import { CONTACTS, FORM_ENDPOINT } from './config.js';

function applyContacts() {
  const { phone, telegram, instagram, tiktok } = CONTACTS;
  for (const a of document.querySelectorAll('[data-contact="phone"]')) {
    a.href = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '#booking';
  }
  if (phone) for (const s of document.querySelectorAll('[data-contact-text="phone"]')) s.textContent = phone;

  for (const a of document.querySelectorAll('[data-contact="telegram"]')) {
    if (telegram) {
      a.href = `https://t.me/${telegram}`;
    } else {
      a.href = a.classList.contains('header-link') ? '#contact' : '#booking';
      a.removeAttribute('target');
    }
  }
  if (telegram) for (const s of document.querySelectorAll('[data-contact-text="telegram"]')) s.textContent = `@${telegram}`;

  for (const [key, url] of Object.entries({ instagram, tiktok })) {
    for (const a of document.querySelectorAll(`[data-contact="${key}"]`)) {
      a.hidden = !url;
      if (url) a.href = url;
    }
  }
}

export function initContact() {
  applyContacts();

  const sign = document.getElementById('finalSign');
  const form = document.getElementById('booking');
  if (!form) return;
  sign?.addEventListener('click', () => sign.classList.toggle('is-open'));

  // площа з калькулятора переходить у заявку
  const area = document.getElementById('bookingArea');
  document.getElementById('receiptCta')?.addEventListener('click', () => {
    if (document.body.dataset.area) area.value = document.body.dataset.area;
  });

  const error = document.getElementById('bookingError');
  const done = document.getElementById('bookingDone');
  const doneText = document.getElementById('bookingDoneText');
  const submit = form.querySelector('.booking-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const missing = ['name', 'phone'].filter((k) => !String(data[k] || '').trim());
    for (const k of ['name', 'phone']) form.elements[k].setAttribute('aria-invalid', String(missing.includes(k)));
    if (missing.length) {
      error.textContent = "Вкажіть ім'я та телефон, щоб Дмитро міг вам передзвонити.";
      form.elements[missing[0]].focus();
      return;
    }
    error.textContent = '';
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Надсилаємо…';

    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(String(res.status));
      }
      const name = String(data.name).trim().split(/\s+/)[0];
      doneText.textContent = `${name}, дякуємо! Дмитро зв'яжеться з вами найближчим часом.`;
      form.classList.add('is-sent');
      done.hidden = false;
      sign?.classList.add('is-open');
    } catch {
      error.textContent = 'Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте Дмитру.';
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Надіслати заявку';
    }
  });
}
