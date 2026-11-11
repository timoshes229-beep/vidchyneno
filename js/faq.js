// «Запитайте шефа»: питання летить повідомленням, Дмитро «друкує» й відповідає
export function initFaq() {
  const feed = document.getElementById('chatFeed');
  const questions = document.getElementById('chatQuestions');
  const status = document.getElementById('chatStatus');
  if (!feed || !questions) return;
  let busy = false;

  const add = (cls, text) => {
    const m = document.createElement('div');
    m.className = `msg ${cls}`;
    if (text) m.textContent = text;
    feed.appendChild(m);
    feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
    return m;
  };

  questions.addEventListener('click', (e) => {
    const q = e.target.closest('button.chat-q');
    if (!q || busy) return;
    busy = true;
    q.classList.add('is-asked');
    for (const b of questions.querySelectorAll('button')) b.disabled = true;
    add('msg-out', q.textContent);
    setTimeout(() => {
      const typing = add('msg-in msg-typing');
      typing.innerHTML = '<i></i><i></i><i></i>';
      status.textContent = 'друкує…';
      status.classList.add('is-typing');
      const answer = q.dataset.a;
      setTimeout(() => {
        typing.remove();
        add('msg-in', answer);
        status.textContent = 'у мережі';
        status.classList.remove('is-typing');
        for (const b of questions.querySelectorAll('button')) b.disabled = false;
        busy = false;
      }, Math.min(1600, 500 + answer.length * 6));
    }, 350);
  });
}
