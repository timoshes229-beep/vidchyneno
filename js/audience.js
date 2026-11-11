// «Яка з дверей ваша?»: двері відчиняються, а вибір переходить у заявку
export function initAudience() {
  const cards = [...document.querySelectorAll('.door-card')];
  for (const card of cards) {
    card.querySelector('.door-leaf').addEventListener('click', () => {
      const open = !card.classList.contains('is-open');
      for (const c of cards) c.classList.remove('is-open');
      card.classList.toggle('is-open', open);
    });
    card.querySelector('.door-cta').addEventListener('click', (e) => {
      const comment = document.getElementById('booking')?.elements.comment;
      if (comment && !comment.dataset.touched) comment.value = e.currentTarget.dataset.intent;
    });
  }
}
