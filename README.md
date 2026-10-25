# Telegram order bot for a cafe

[![CI](https://github.com/chelp-dev/telegram-order-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/chelp-dev/telegram-order-bot/actions/workflows/ci.yml)

A Telegram bot for a made-up cafe, "Ranok — Morning Cafe": menu, cart, checkout with delivery or pickup, table booking, and the staff side of every order. Ukrainian and English. grammY + TypeScript.

Try it: [t.me/ranok_demo_bot](https://t.me/ranok_demo_bot)

## Screenshots

<!-- SCREENSHOTS: add images here (menu, cart, order card, staff view, booking). -->

_Screenshots will be added here._

## Features

- **Menu by category** with `+` / `−` quantity buttons. Prices in UAH for Ukrainian users, EUR for everyone else.
- **Checkout**: delivery or pickup, name, phone (share the Telegram contact or type it), address for delivery, optional comment, final confirmation.
- **Live order card**: the customer's message updates in place as the status changes.
- **Staff view**: the demo also sends the customer the card the cafe staff would see, with Accept / Cooking / On the way / Done buttons that update the customer's card. If nobody presses them, statuses advance every ~12 seconds.
- **Table booking**: date (next 7 days), time slot, party size, confirmation; staff can confirm or decline.
- **Language** from the Telegram app (`uk`/`ru` → Ukrainian, otherwise English); `/lang` switches it.
- **Public-demo safety**: private chats only, per-user rate limits, length-checked and HTML-escaped input, validated phone numbers, bounded memory.

## Architecture

```
src/
  index.ts      entry point: config, start polling, graceful shutdown
  config.ts     environment variables, validated at startup
  bot.ts        wiring: private-chat guard, rate limit, flows, error handler, cleanup timer
  context.ts    context type and helpers: show a screen, register a button
  store.ts      in-memory sessions, orders and bookings (24h TTL, size caps)
  staff.ts      order/booking lifecycle, demo timers, keeping both cards in sync
  data/         business data: menu.ts (items, prices), booking.ts (slots, party sizes)
  i18n/         uk.ts (defines the keys), en.ts
  core/         pure logic: cart, catalog, statuses, booking schedule, validation, rate limiter
  flows/        Telegram handlers: start, menu, checkout, booking, staff buttons; cards.ts builds card text
test/           unit tests and end-to-end flows against a fake Telegram API
```

Checkout is a small explicit state machine (`Session.step`) rather than a conversation plugin, so each step is easy to follow and test. Order statuses only move forward (`core/status.ts`). grammY handles updates one at a time, so the only concurrency is between demo timers and button presses; card renders are queued per order, so an older status never overwrites a newer one.

## Run locally

Needs Node.js 22.13+ and a bot token from [@BotFather](https://t.me/BotFather) (`/newbot`).

```bash
cp .env.example .env     # paste the token into BOT_TOKEN
npm ci
npm run dev              # long polling, restarts on file changes
```

Then open your bot in Telegram and send `/start`.

Other scripts: `npm run build` and `npm start` (compiled), `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`.

## Deploy with Docker

```bash
cp .env.example .env     # fill in BOT_TOKEN
docker compose up -d --build
```

The image is multi-stage, holds only production dependencies and runs as the non-root `node` user. The compose file adds a read-only filesystem, `no-new-privileges` and a 256 MB memory limit. On `SIGTERM` the bot stops polling and its timers, then exits.

## Configuration

| Variable               | Default                                           | Meaning                                                      |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| `BOT_TOKEN`            | (required)                                        | Token from BotFather                                         |
| `AUTO_ADVANCE_SECONDS` | `12`                                              | Seconds between automatic status changes; `0` turns them off |
| `CAFE_TIMEZONE`        | `Europe/Kyiv`                                     | IANA time zone for booking dates and slots                   |
| `REPO_URL`             | `https://github.com/chelp-dev/telegram-order-bot` | Link shown in "About this demo"                              |

Empty values fall back to the default. An invalid number or time zone stops the bot at startup with a clear message.

## Adapt it for your business

- **Menu, categories, prices**: `src/data/menu.ts`. Names in both languages; prices in minor units. `CURRENCY` there picks the currency per language.
- **Booking slots and party sizes**: `src/data/booking.ts`.
- **All texts, including the cafe name**: `src/i18n/uk.ts` and `src/i18n/en.ts`. The compiler and a test check that both have the same keys.
- **Rate limits**: `LIMITS` in `src/bot.ts`.
- **Real staff chat**: `src/staff.ts` sends the staff card to the customer's chat. Send it to your team's chat id instead and drop the demo timer.
- **Persistence**: `src/store.ts` is in-memory. Replace it with SQLite or Postgres if orders must survive restarts.

## Limits of the demo

- State lives in memory: a restart wipes it (old buttons then answer "expired"), and everything is deleted after 24 hours.
- No payments and no real kitchen: the customer sees the staff card, and statuses advance on a timer.
- Booking does not track table capacity; every slot is always free.
- A single process with long polling.

## Українською

Демо-бот для вигаданої кав’ярні «Ранок»: меню за категоріями, кошик, оформлення замовлення (доставка або самовивіз, ім’я, телефон, адреса, коментар) і бронювання столика на найближчі 7 днів. Після підтвердження користувач бачить картку замовлення та «вигляд для персоналу» з кнопками, які змінюють статус у картці клієнта. Якщо нічого не натискати, статуси змінюються самі. Спробувати: [t.me/ranok_demo_bot](https://t.me/ranok_demo_bot).

**Запуск:** створіть бота в [@BotFather](https://t.me/BotFather), скопіюйте `.env.example` у `.env`, вставте токен у `BOT_TOKEN`, далі `npm ci` і `npm run dev`. Або `docker compose up -d --build`.

**Як адаптувати:** меню й ціни в `src/data/menu.ts`, час бронювання в `src/data/booking.ts`, тексти в `src/i18n/uk.ts` та `src/i18n/en.ts`.

**Обмеження:** дані зберігаються лише в пам’яті й видаляються через 24 години; оплати немає.

## License

MIT, see [LICENSE](LICENSE).

---

Built by [chelp.dev](https://chelp.dev).
