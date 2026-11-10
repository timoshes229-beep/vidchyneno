// «Назвіть свій заклад»: назва й формат оживають на фасаді, у залі та в заявці
const SELECT_BY_FORMAT = {
  restaurant: 'Кафе або ресторан',
  coffee: "Кав'ярня",
  pizza: 'Піцерія, суші чи бургерна',
  burger: 'Піцерія, суші чи бургерна',
};

export const place = { name: '', format: 'restaurant' };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('vidchyneno-place') || '{}');
    if (typeof saved.name === 'string') place.name = saved.name.slice(0, 26);
    if (SELECT_BY_FORMAT[saved.format]) place.format = saved.format;
  } catch { /* сховище недоступне — починаємо з нуля */ }
}
function save() {
  try { localStorage.setItem('vidchyneno-place', JSON.stringify(place)); } catch { /* не критично */ }
}

export function initPlace(hero) {
  const form = document.getElementById('place');
  if (!form) return;
  const input = document.getElementById('placeName');
  const chips = [...form.querySelectorAll('.place-format')];
  const signName = document.getElementById('finalSignName');
  const booking = document.getElementById('booking');
  const bookingPlace = document.getElementById('bookingPlace');
  const bookingFormat = booking?.elements.format;

  // поля заявки, які людина змінила сама, більше не перезаписуємо
  for (const el of [bookingPlace, bookingFormat]) el?.addEventListener('input', () => { el.dataset.touched = '1'; });

  function apply() {
    const name = place.name.trim();
    hero?.setPlace({ name, format: place.format });
    for (const c of chips) {
      const on = c.dataset.format === place.format;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    }
    if (signName) signName.textContent = name ? `«${name}»` : 'від ідеї до першого гостя';
    const buildSign = document.getElementById('buildSignText');
    if (buildSign) buildSign.textContent = name || 'Ваш заклад';
    if (bookingPlace && !bookingPlace.dataset.touched) bookingPlace.value = name;
    if (bookingFormat && !bookingFormat.dataset.touched) bookingFormat.value = SELECT_BY_FORMAT[place.format];
    save();
  }

  load();
  input.value = place.name;
  let timer;
  input.addEventListener('input', () => {
    place.name = input.value;
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  });
  form.addEventListener('click', (e) => {
    const chip = e.target.closest('.place-format');
    if (!chip) return;
    place.format = chip.dataset.format;
    apply();
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });
  apply();
}
