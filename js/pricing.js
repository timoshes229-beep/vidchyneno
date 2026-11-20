// Калькулятор: від площі на подіумі виростає заклад, а принтер «друкує» новий рахунок
const TIERS = [
  { max: 20, min: 10, name: 'кіоск чи стрітфуд', label: 'до 20 м²', fee: '$2 800', inv: '$10 000 – $18 000' },
  { max: 40, min: 20, name: "кав'ярня", label: '20–40 м²', fee: '$3 300', inv: '$15 000 – $25 000' },
  { max: 60, min: 40, name: 'кафе', label: '40–60 м²', fee: '$3 600', inv: '$20 000 – $40 000' },
  { max: 80, min: 60, name: 'ресторан', label: '60–80 м²', fee: '$4 800', inv: '$35 000 – $65 000' },
  { max: Infinity, min: 80, name: 'великий ресторан', label: 'понад 80 м²', fee: 'індивідуально', inv: 'рахуємо разом' },
];

export function initPricing() {
  const range = document.getElementById('areaRange');
  if (!range) return;
  const stage = document.getElementById('growStage');
  const pics = [...stage.querySelectorAll('img')];
  const name = document.getElementById('growName');
  const planArea = document.getElementById('planArea');
  const value = document.getElementById('areaValue');
  const receipt = document.getElementById('receipt');
  const rArea = document.getElementById('rArea');
  const rFee = document.getElementById('rFee');
  const rInv = document.getElementById('rInv');

  let tier = null;
  function update() {
    const a = Number(range.value);
    const big = a > 80;
    const text = big ? 'понад 80 м²' : `${a} м²`;
    value.textContent = text;
    planArea.textContent = text;
    range.style.setProperty('--fill', `${((a - 10) / 90) * 100}%`);
    document.body.dataset.area = text;

    const t = TIERS.find((x) => a <= x.max);
    // усередині одного розміру будівля ще трохи підростає, щоб повзунок завжди відгукувався
    const k = t.max === Infinity ? (a - 80) / 20 : (a - t.min) / (t.max - t.min);
    stage.style.setProperty('--k', Math.min(Math.max(k, 0), 1).toFixed(3));
    if (t !== tier) {
      const first = tier === null;
      tier = t;
      pics.forEach((p, i) => p.classList.toggle('is-on', i === TIERS.indexOf(t)));
      name.textContent = t.name;
      rArea.textContent = t.label;
      rFee.textContent = t.fee;
      rInv.textContent = t.inv;
      if (!first) {
        receipt.classList.remove('is-printing');
        void receipt.offsetWidth;
        receipt.classList.add('is-printing');
      }
    }
  }
  range.addEventListener('input', update);
  update();
}
