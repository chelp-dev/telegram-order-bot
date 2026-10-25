import { createBot } from './bot.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN is not set. Create a bot with @BotFather and put its token into .env (see .env.example).');
  process.exit(1);
}

const autoAdvanceSeconds = Number(process.env.AUTO_ADVANCE_SECONDS ?? 12);

const { bot, setCommands, stop } = createBot(token, {
  autoAdvanceMs: Number.isFinite(autoAdvanceSeconds) ? Math.max(0, autoAdvanceSeconds) * 1000 : 12_000,
  timeZone: process.env.CAFE_TIMEZONE ?? 'Europe/Kyiv',
  siteUrl: 'https://chelp.dev',
  repoUrl: process.env.REPO_URL ?? 'https://github.com/chelp-dev/telegram-order-bot',
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void stop());
}

await setCommands();
await bot.start({
  drop_pending_updates: true,
  onStart: (me) => console.log(`@${me.username} is running (long polling)`),
});
