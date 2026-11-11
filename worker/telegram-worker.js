// Посередник між сайтом і Telegram (Cloudflare Worker).
// Ключ бота зберігається тут, у секретах Cloudflare, а не в коді сайту.
// Змінні середовища: BOT_TOKEN (секрет), CHAT_ID (один або кілька через кому), ALLOWED_ORIGIN.

const LIMIT = 600;
const esc = (v) => String(v ?? '').slice(0, LIMIT).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://timoshes229-beep.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return reply({ ok: false, error: 'method' }, 405);

    let d;
    try { d = await request.json(); } catch { return reply({ ok: false, error: 'json' }, 400); }
    // пастка для ботів: справжні люди це поле не бачать і не заповнюють
    if (d.website) return reply({ ok: true });
    if (!String(d.name || '').trim() || !String(d.phone || '').trim()) return reply({ ok: false, error: 'required' }, 400);

    const lines = [
      '🔑 <b>Нова заявка з сайту «Відчинено»</b>',
      '',
      `<b>Ім'я:</b> ${esc(d.name)}`,
      `<b>Контакт:</b> ${esc(d.phone)}`,
      d.place && `<b>Назва закладу:</b> ${esc(d.place)}`,
      d.format && `<b>Формат:</b> ${esc(d.format)}`,
      d.area && `<b>Площа:</b> ${esc(d.area)}`,
      d.premises && `<b>Приміщення:</b> ${d.premises === 'Є' ? 'вже є' : 'треба знайти'}`,
      d.comment && `\n<b>Коментар:</b>\n${esc(d.comment)}`,
    ].filter(Boolean);

    const chats = String(env.CHAT_ID || '').split(',').map((c) => c.trim()).filter(Boolean);
    const results = await Promise.all(chats.map((chat_id) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
    })));
    const ok = results.length > 0 && results.every((r) => r.ok);
    return reply({ ok }, ok ? 200 : 502);
  },
};
