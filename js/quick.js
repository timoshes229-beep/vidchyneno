import { FORM_ENDPOINT } from './config.js?v=202611252319';

// Швидка заявка з першого екрана: лише телефон, Дмитро передзвонить і порахує заклад
export function initQuick() {
  const form = document.getElementById('quick');
  if (!form) return;
  const input = form.elements.phone;
  const note = document.getElementById('quickNote');
  const button = form.querySelector('button');
  const hint = note.textContent;

  // лише цифри з пробілами: 67 123 45 67; нуль на початку прибираємо
  input.addEventListener('input', () => {
    const d = input.value.replace(/\D/g, '').replace(/^(380|0)/, '').slice(0, 9);
    input.value = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
    form.classList.remove('is-error');
    note.textContent = hint;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const digits = input.value.replace(/\D/g, '');
    if (digits.length !== 9) {
      form.classList.add('is-error');
      note.textContent = 'Перевірте номер: потрібно 9 цифр після +380.';
      input.focus();
      return;
    }
    button.disabled = true;
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ phone: `+380 ${input.value}`, comment: 'Швидка заявка з першого екрана: передзвонити й порахувати заклад.' }),
        });
        if (!res.ok) throw new Error(String(res.status));
      }
      form.classList.add('is-sent');
      note.textContent = 'Дякуємо! Дмитро передзвонить найближчим часом.';
      input.disabled = true;
    } catch {
      note.textContent = 'Не вдалося надіслати. Спробуйте ще раз або напишіть у Telegram.';
      button.disabled = false;
    }
  });
}
