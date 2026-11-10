// Калькулятор: площа малює зал на плані й «друкує» новий рахунок
const TIERS = [
  { max: 20, label: 'до 20 м²', fee: '$2 800', inv: '$10 000 – $18 000' },
  { max: 40, label: '20–40 м²', fee: '$3 300', inv: '$15 000 – $25 000' },
  { max: 60, label: '40–60 м²', fee: '$3 600', inv: '$20 000 – $40 000' },
  { max: 80, label: '60–80 м²', fee: '$4 800', inv: '$35 000 – $65 000' },
  { max: Infinity, label: 'понад 80 м²', fee: 'індивідуально', inv: 'рахуємо разом' },
];

export function initPricing() {
  const range = document.getElementById('areaRange');
  if (!range) return;
  const room = document.getElementById('planRoom');
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
    // план 10 × 10 клітинок, тобто 100 м²; зал квадратний
    const side = `${(Math.sqrt(a) * 10).toFixed(2)}%`;
    room.style.setProperty('--w', side);
    room.style.setProperty('--h', side);
    range.style.setProperty('--fill', `${((a - 10) / 90) * 100}%`);
    document.body.dataset.area = text;

    const t = TIERS.find((x) => a <= x.max);
    if (t !== tier) {
      const first = tier === null;
      tier = t;
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
