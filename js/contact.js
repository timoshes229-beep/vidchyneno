import { CONTACTS, FORM_ENDPOINT } from './config.js?v=202611141412';
import { initPhone, phone } from './phone.js?v=202611141412';

const esc = (v) => String(v || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

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
  sign?.addEventListener('click', () => { sign.classList.toggle('is-open'); });

  // площа з калькулятора переходить у заявку
  const area = document.getElementById('bookingArea');
  document.getElementById('receiptCta')?.addEventListener('click', () => {
    if (document.body.dataset.area) area.value = document.body.dataset.area;
    const comment = form.elements.comment;
    if (comment && !comment.dataset.touched && !comment.value) comment.value = 'Хочу прогноз прибутку й окупності для свого закладу.';
  });

  initPhone();
  const error = document.getElementById('bookingError');
  const done = document.getElementById('bookingDone');
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
    if (!phone.isValid()) {
      form.elements.phone.setAttribute('aria-invalid', 'true');
      error.textContent = 'Перевірте номер: здається, в ньому не вистачає цифр.';
      form.elements.phone.focus();
      return;
    }
    data.phone = phone.value();
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
      // заявка друкується як кухонне замовлення: після 20+ закладів ваш стане 21-м
      const first = String(data.name).trim().split(/\s+/)[0];
      const rows = [
        ['Гість', data.name],
        ['Контакт', data.phone],
        ['Формат', data.format || 'ще обираємо'],
        ['Площа', data.area || 'уточнимо'],
        ['Приміщення', data.premises === 'Є' ? 'вже є' : 'треба знайти'],
      ];
      done.innerHTML = `
        <div class="order-ticket">
          <p class="order-head"><span>Замовлення</span><span>№ 0021</span></p>
          <p class="order-title">${esc(data.place) || 'Новий заклад'}</p>
          <dl class="order-lines">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          <p class="order-foot">${esc(first)}, дякуємо! Дмитро зв'яжеться з вами найближчим часом.</p>
          <span class="order-stamp">Прийнято</span>
        </div>`;
      form.classList.add('is-sent');
      done.hidden = false;
      setTimeout(() => { sign?.classList.add('is-open'); }, 900);
    } catch {
      error.textContent = 'Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте Дмитру.';
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Надіслати заявку';
    }
  });
}
