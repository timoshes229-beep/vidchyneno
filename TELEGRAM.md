# Заявки с сайта в Telegram

Форма отправляет заявку на маленький «посредник» (Cloudflare Worker), а он пересылает её в Telegram.
Ключ бота хранится только в Cloudflare, в коде сайта его нет.

## 1. Создать бота (2 минуты)
1. В Telegram открыть **@BotFather** → `/newbot`.
2. Имя, например: `Відчинено заявки`. Ник, например: `vidchyneno_leads_bot`.
3. BotFather пришлёт **токен** вида `1234567890:AA...`. Никому его не пересылать.

## 2. Узнать свой chat id
1. Открыть своего нового бота и нажать **Start**.
2. Открыть в браузере `https://api.telegram.org/bot<ТОКЕН>/getUpdates` (вместо `<ТОКЕН>` вставить токен).
3. Найти `"chat":{"id":123456789` — это число и есть **CHAT_ID**.

## 3. Разместить посредника (бесплатно)
1. Зарегистрироваться на **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Create Worker** → **Deploy**.
2. **Edit code** → удалить всё → вставить содержимое `worker/telegram-worker.js` → **Deploy**.
3. **Settings → Variables and Secrets** → добавить:
   - `BOT_TOKEN` — тип **Secret**, значение: токен бота;
   - `CHAT_ID` — chat id (можно несколько через запятую: твой и Димы);
   - `ALLOWED_ORIGIN` — `https://timoshes229-beep.github.io`
4. Скопировать адрес воркера вида `https://vidchyneno-leads.<имя>.workers.dev`.

## 4. Подключить к сайту
Вписать адрес в `js/config.js`:
```js
export const FORM_ENDPOINT = 'https://vidchyneno-leads.<имя>.workers.dev';
```

## Переключить заявки на Диму
Дима нажимает **Start** у бота, узнаёт свой chat id (шаг 2) и его вписывают в `CHAT_ID` в Cloudflare.
Можно оставить оба через запятую — заявки будут приходить и тебе, и ему.
