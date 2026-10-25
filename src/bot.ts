import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import type { BotConfig } from './config.js';
import type { BotContext } from './context.js';
import { RateLimiter } from './core/rateLimit.js';
import { bookingFlow } from './flows/booking.js';
import { checkoutFlow, checkoutGuard } from './flows/checkout.js';
import { menuFlow } from './flows/menu.js';
import { staffFlow } from './flows/staff.js';
import { fallbackFlow, startFlow } from './flows/start.js';
import { dict, pickLang, type Lang } from './i18n/index.js';
import { Staff } from './staff.js';
import { Store } from './store.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const SWEEP_INTERVAL_MS = 10 * MINUTE_MS;

/** Abuse limits for a public demo, per user. */
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
  const updateLimiter = new RateLimiter(LIMITS.updatesPerMinute, MINUTE_MS);
  const orderLimiter = new RateLimiter(LIMITS.ordersPerHour, HOUR_MS);
  const bookingLimiter = new RateLimiter(LIMITS.bookingsPerHour, HOUR_MS);

  // Private chats only. Updates over the flood limit are dropped (a pressed button is still
  // answered, so it stops spinning). Everything after this sees ctx.session.
  bot.use(async (ctx, next) => {
    if (!ctx.from || ctx.chat?.type !== 'private') return;
    if (!updateLimiter.hit(String(ctx.from.id))) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => undefined);
      return;
    }
    ctx.session = store.session(ctx.from.id, pickLang(ctx.from.language_code));
    await next();
  });

  bot.use(checkoutGuard());
  bot.use(startFlow(config));
  bot.use(menuFlow());
  bot.use(checkoutFlow({ store, staff, orderLimiter }));
  bot.use(bookingFlow({ store, staff, bookingLimiter, config }));
  bot.use(staffFlow(staff));
  bot.use(fallbackFlow());

  // Errors in handlers end up here; logging them keeps the bot polling.
  bot.catch(({ ctx, error }) => {
    console.error(`Error while handling update ${ctx.update.update_id}:`, error);
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

  /** Stops polling (letting the update in progress finish) and every pending timer. */
  async function stop(): Promise<void> {
    clearInterval(sweeper);
    store.stopTimers();
    await bot.stop();
  }

  return { bot, store, setCommands, stop };
}
