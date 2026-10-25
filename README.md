# Ranok — demo order bot for a cafe

A Telegram bot for a made-up cafe, "Ranok / Morning Cafe". It shows what a small-business bot can do: a menu, a cart, checkout with delivery or pickup, table booking, and the staff side of every order. The bot speaks Ukrainian and English.

> Screenshots: _coming soon_

## What it does

- **Menu by category** (coffee, breakfast, desserts) with `+` / `−` quantities. Prices are in UAH for Ukrainian users and in EUR for everyone else.
- **Cart and checkout**: delivery or pickup, name, phone (share your Telegram contact or type it), address for delivery, an optional comment, then a final confirmation.
- **Order tracking**: the customer gets an order card with a live status. Because this is a demo, the same user also gets the **staff view** ("This is what the cafe staff see") with Accept / Cooking / On the way / Done buttons. Pressing them updates the customer's card. If nobody presses anything, statuses advance by themselves every ~12 seconds, so the whole loop plays out in about a minute.
- **Table booking**: date (next 7 days), time slot, number of guests, confirmation, plus a staff view with Confirm / Decline.
- **Language** is picked from the Telegram app language (`uk`/`ru` → Ukrainian, otherwise English). `/lang` switches it.

Built to run as a public demo:

- Per-user rate limits (30 updates a minute, 5 orders and 5 bookings an hour); private chats only.
- Input is length-checked and HTML-escaped; phone numbers are validated.
- State lives in memory only. Sessions, orders and bookings are deleted after 24 hours, and a restart wipes everything (old buttons then answer "expired"). No payments.

## Run it

You need Node.js 22.9+ and a bot token.

1. Open [@BotFather](https://t.me/BotFather) in Telegram, send `/newbot`, and copy the token.
2. Set up and start:

   ```bash
   cp .env.example .env     # paste the token into BOT_TOKEN
   npm install
   npm run dev              # long polling, restarts on file changes
   ```

3. Open your bot in Telegram and send `/start`.

Other scripts: `npm test` (Vitest), `npm run typecheck`, `npm run build && npm start`.

### Docker

```bash
cp .env.example .env     # fill in BOT_TOKEN
docker compose up -d --build
```

The image is multi-stage, runs as the non-root `node` user and holds only production dependencies.

### Settings (`.env`)

| Variable               | Default       | Meaning                                                      |
| ---------------------- | ------------- | ------------------------------------------------------------ |
| `BOT_TOKEN`            | —             | Token from BotFather (required)                              |
| `AUTO_ADVANCE_SECONDS` | `12`          | Seconds between automatic status changes; `0` turns them off |
| `CAFE_TIMEZONE`        | `Europe/Kyiv` | Time zone for booking dates and slots                        |
| `REPO_URL`             | placeholder   | Link shown in "About this demo"                              |

## Adapt it for your business

- **Menu and prices**: edit `src/menu.ts`. Categories and items have names in both languages; prices are in minor units (kopiyky / cents).
- **Texts**: edit `src/i18n/uk.ts` and `src/i18n/en.ts`. The compiler and a test both check that the two files have the same keys, so a missing translation fails the build.
- **Booking hours and party sizes**: `TIME_SLOTS` and `GUEST_OPTIONS` in `src/core/schedule.ts`.
- **Real staff chat**: `src/flows/staff.ts` sends the staff card to the customer's own chat. Point it at your team's chat id instead, and drop the auto-advance timer.
- **Persistence**: `src/store.ts` is a small in-memory store. Swap it for SQLite or Postgres if orders must survive restarts.

## Project layout

```
src/
  index.ts          entry point: reads env, starts long polling
  bot.ts            wiring: guard and rate limit, flows, cleanup timer
  context.ts        context type, "show a screen" and button helpers
  menu.ts           menu data and money formatting
  store.ts          in-memory sessions, orders, bookings (24h TTL)
  i18n/             uk.ts (defines the keys), en.ts
  core/             pure logic: cart, statuses, booking schedule, validation, rate limiter
  flows/            start, menu, checkout, booking, staff, cards
test/               unit tests plus an end-to-end flow against a fake Telegram API
```

Checkout is a small explicit state machine (`Session.step`) rather than a conversation plugin, so each step is easy to follow and test.

## Українською

Демо-бот для вигаданої кав’ярні «Ранок»: меню з категоріями, кошик, оформлення замовлення (доставка або самовивіз, ім’я, телефон, адреса, коментар), бронювання столика на найближчі 7 днів. Після підтвердження користувач бачить картку замовлення, а також «вигляд для персоналу» з кнопками Прийняти / Готуємо / В дорозі / Виконано. Якщо нічого не натискати, статуси змінюються самі, і весь цикл видно приблизно за хвилину.

Мова визначається за мовою Telegram (uk/ru → українська, інші → англійська), `/lang` перемикає її. Дані зберігаються лише в пам’яті й видаляються через 24 години.

**Запуск:** створіть бота в [@BotFather](https://t.me/BotFather), скопіюйте `.env.example` у `.env` і вставте токен у `BOT_TOKEN`, далі `npm install` і `npm run dev`.

**Як адаптувати під свій бізнес:** меню й ціни в `src/menu.ts`, тексти в `src/i18n/uk.ts` та `src/i18n/en.ts`, години бронювання в `src/core/schedule.ts`.

## License

MIT, see [LICENSE](LICENSE).

---

Built by [chelp.dev](https://chelp.dev) — I build bots, websites, apps and automations for small businesses.
