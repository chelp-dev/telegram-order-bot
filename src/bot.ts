import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { RateLimiter } from './core/rateLimit.js';
import type { BotConfig, BotContext } from './context.js';
import { bookingFlow } from './flows/booking.js';
import { checkoutFlow } from './flows/checkout.js';
import { menuFlow } from './flows/menu.js';
import { Staff, staffFlow } from './flows/staff.js';
import { fallbackFlow, startFlow } from './flows/start.js';
import { dict, pickLang, type Lang } from './i18n/index.js';
import { Store } from './store.js';

const HOUR_MS = 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/** Abuse limits for a public demo. */
export const LIMITS = {
  updatesPerMinute: 30,
  ordersPerHour: 5,
  bookingsPerHour: 5,
} as const;

/** `botInfo` is only needed in tests, to skip the getMe call. */
export function createBot(token: string, config: BotConfig, botInfo?: UserFromGetMe) {
  const bot = new Bot<BotContext>(token, { botInfo });
  const store = new Store();
  const staff = new Staff(bot.api, store, config.autoAdvanceMs);
  const updateLimiter = new RateLimiter(LIMITS.updatesPerMinute, 60_000);
  const orderLimiter = new RateLimiter(LIMITS.ordersPerHour, HOUR_MS);
  const bookingLimiter = new RateLimiter(LIMITS.bookingsPerHour, HOUR_MS);

  // Private chats only; flooding users are dropped silently; then attach the session.
  bot.use(async (ctx, next) => {
    if (!ctx.from || ctx.chat?.type !== 'private') return;
    if (!updateLimiter.hit(String(ctx.from.id))) return;
    ctx.s = store.session(ctx.from.id, pickLang(ctx.from.language_code));
    await next();
  });

  bot.use(startFlow(config));
  bot.use(menuFlow());
  bot.use(checkoutFlow({ store, staff, orderLimiter }));
  bot.use(bookingFlow({ store, staff, bookingLimiter, config }));
  bot.use(staffFlow(staff));
  bot.use(fallbackFlow());

  bot.catch((error) => {
    console.error(`Error while handling update ${error.ctx.update.update_id}:`, error.error);
  });

  const sweeper = setInterval(() => {
    store.sweep();
    for (const limiter of [updateLimiter, orderLimiter, bookingLimiter]) limiter.prune();
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  /** Registers the "/" command menu: English by default, Ukrainian for uk and ru clients. */
  async function setCommands(): Promise<void> {
    const commands = (lang: Lang) => [
      { command: 'start', description: dict[lang].cmdStart },
      { command: 'lang', description: dict[lang].cmdLang },
      { command: 'cancel', description: dict[lang].cmdCancel },
    ];
    await bot.api.setMyCommands(commands('en'));
    await bot.api.setMyCommands(commands('uk'), { language_code: 'uk' });
    await bot.api.setMyCommands(commands('uk'), { language_code: 'ru' });
  }

  async function stop(): Promise<void> {
    clearInterval(sweeper);
    store.stopTimers();
    await bot.stop();
  }

  return { bot, setCommands, stop };
}
