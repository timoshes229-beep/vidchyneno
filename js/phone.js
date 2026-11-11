// Телефон з вибором країни: маска за країною, лише цифри, перевірка довжини.
// Бібліотека intl-tel-input вантажиться, лише коли форма близько.
const CDN = 'https://cdn.jsdelivr.net/npm/intl-tel-input@24.5.0/build/';
let iti = null;
let input = null;

function load() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = `${CDN}css/intlTelInput.min.css`;
  document.head.appendChild(css);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${CDN}js/intlTelInputWithUtils.min.js`;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function setup() {
  const lib = window.intlTelInput;
  const names = new Intl.DisplayNames(['uk'], { type: 'region' });
  const i18n = {
    searchPlaceholder: 'Пошук країни',
    selectedCountryAriaLabel: 'Обрана країна',
    noCountrySelected: 'Країну не обрано',
    countryListAriaLabel: 'Список країн',
    zeroSearchResults: 'Нічого не знайдено',
    oneSearchResult: 'Знайдено 1 країну',
    multipleSearchResults: 'Знайдено ${count} країн',
  };
  for (const c of lib.getCountryData()) {
    try { i18n[c.iso2] = names.of(c.iso2.toUpperCase()) || c.name; } catch { i18n[c.iso2] = c.name; }
  }
  iti = lib(input, {
    initialCountry: 'ua',
    countryOrder: ['ua', 'pl', 'de', 'cz', 'sk', 'md', 'ro', 'gb', 'us', 'ca'],
    separateDialCode: true,
    strictMode: false,
    formatAsYouType: false,
    placeholderNumberType: 'MOBILE',
    i18n,
  });
  mask();
}

// довжина номера країни без коду, за прикладом мобільного номера
function maxDigits(c) {
  const u = window.intlTelInput.utils;
  const ex = u.getExampleNumber(c.iso2, false, u.numberType.MOBILE) || '';
  return ex.replace(/\D/g, '').length - String(c.dialCode).length || 15;
}

function mask() {
  let digits = input.value.replace(/\D/g, '');
  if (!iti || !window.intlTelInput?.utils) {
    if (digits !== input.value.replace(/[^\d\s]/g, '')) input.value = digits;
    return;
  }
  const c = iti.getSelectedCountryData();
  if (!c?.iso2) { input.value = digits.slice(0, 15); return; }
  const u = window.intlTelInput.utils;
  const ex = u.getExampleNumber(c.iso2, false, u.numberType.MOBILE) || '';
  const national = ex.replace(/\D/g, '').slice(String(c.dialCode).length);
  // українці часто пишуть 067…: зайвий нуль на початку прибираємо
  if (!national.startsWith('0')) digits = digits.replace(/^0+/, '');
  digits = digits.slice(0, maxDigits(c));
  const full = u.formatNumberAsYouType(`+${c.dialCode}${digits}`, c.iso2);
  const shown = digits ? full.replace(new RegExp(`^\\+${c.dialCode}\\s?`), '') : '';
  if (input.value !== shown) input.value = shown;
}

export function initPhone() {
  input = document.getElementById('bookingPhone');
  if (!input) return;
  // лише цифри, не довше за номер обраної країни, з пробілами за маскою
  input.addEventListener('input', mask);
  input.addEventListener('countrychange', mask);
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    load().then(setup).catch((err) => console.warn('Маска телефону недоступна', err));
  }, { rootMargin: '1200px 0px' }).observe(input);
}

export const phone = {
  isValid() {
    if (iti) return iti.isValidNumber();
    return input.value.replace(/\D/g, '').length >= 9;
  },
  // номер у міжнародному форматі для заявки, наприклад +380 67 123 4567
  value() {
    if (!iti) return input.value.trim();
    const fmt = window.intlTelInput?.utils?.numberFormat?.INTERNATIONAL;
    return (fmt !== undefined ? iti.getNumber(fmt) : iti.getNumber()) || input.value.trim();
  },
};
