// Table booking: date -> time -> guests -> confirm. Buttons only, so every step
// re-validates what it receives instead of trusting the session.
import { Composer, InlineKeyboard } from 'grammy';
import type { RateLimiter } from '../core/rateLimit.js';
import { GUEST_OPTIONS, availableSlots, bookableDates, formatDate, isBookable } from '../core/schedule.js';
import { cleanText, TEXT_LIMITS } from '../core/validate.js';
import { onButton, show, tr, type BotConfig, type BotContext } from '../context.js';
import type { Store } from '../store.js';
import { bookingDetails } from './cards.js';
import type { Staff } from './staff.js';

interface BookingDeps {
  store: Store;
  staff: Staff;
  bookingLimiter: RateLimiter;
  config: BotConfig;
}

/** Lays out buttons in rows of `perRow`. */
function grid(keyboard: InlineKeyboard, buttons: { label: string; data: string }[], perRow: number): InlineKeyboard {
  buttons.forEach((button, i) => {
    keyboard.text(button.label, button.data);
    if ((i + 1) % perRow === 0) keyboard.row();
  });
  if (buttons.length % perRow !== 0) keyboard.row();
  return keyboard;
}

export function bookingFlow({ store, staff, bookingLimiter, config }: BookingDeps): Composer<BotContext> {
  const composer = new Composer<BotContext>();
  const { timeZone } = config;

  async function showDates(ctx: BotContext): Promise<string | void> {
    const t = tr(ctx);
    const dates = bookableDates(new Date(), timeZone);
    if (dates.length === 0) return t.noSlots;
    ctx.s.booking = {};
    const keyboard = grid(new InlineKeyboard(), dates.map((date) => ({ label: formatDate(date, t.locale), data: `bk:d:${date}` })), 2);
    await show(ctx, t.chooseDate, keyboard.text(t.btnMainMenu, 'nav:main'));
  }

  async function showTimes(ctx: BotContext, date: string): Promise<string | void> {
    const t = tr(ctx);
    const slots = bookableDates(new Date(), timeZone).includes(date) ? availableSlots(date, new Date(), timeZone) : [];
    if (slots.length === 0) return showDates(ctx);
    ctx.s.booking = { date };
    const keyboard = grid(new InlineKeyboard(), slots.map((slot) => ({ label: slot, data: `bk:t:${slot.replace(':', '')}` })), 4);
    await show(ctx, t.chooseTime(formatDate(date, t.locale)), keyboard.text(t.btnBack, 'nav:book'));
  }

  onButton(composer, 'nav:book', async (ctx) => showDates(ctx));

  onButton(composer, /^bk:d:(\d{4}-\d{2}-\d{2})$/, async (ctx, [, date = '']) => showTimes(ctx, date));

  onButton(composer, /^bk:t:(\d{2})(\d{2})$/, async (ctx, [, hh, mm]) => {
    const t = tr(ctx);
    const { date } = ctx.s.booking;
    const time = `${hh}:${mm}`;
    if (!date || !isBookable(date, time, new Date(), timeZone)) return showDates(ctx);
    ctx.s.booking = { date, time };
    const keyboard = grid(new InlineKeyboard(), GUEST_OPTIONS.map((n) => ({ label: String(n), data: `bk:g:${n}` })), 6);
    await show(ctx, t.chooseGuests(formatDate(date, t.locale), time), keyboard.text(t.btnBack, `bk:d:${date}`));
  });

  onButton(composer, /^bk:g:(\d+)$/, async (ctx, [, count]) => {
    const t = tr(ctx);
    const guests = Number(count);
    const { date, time } = ctx.s.booking;
    if (!date || !time || !(GUEST_OPTIONS as readonly number[]).includes(guests)) return showDates(ctx);
    ctx.s.booking = { date, time, guests };
    const keyboard = new InlineKeyboard().text(t.btnConfirm, 'bk:ok').text(t.btnCancel, 'nav:main');
    await show(ctx, `<b>${t.bookingSummary}</b>\n\n${bookingDetails(t, { date, time, guests })}`, keyboard);
  });

  onButton(composer, 'bk:ok', async (ctx) => {
    const t = tr(ctx);
    const { date, time, guests } = ctx.s.booking;
    if (!date || !time || !guests || !ctx.chat || !ctx.from) return t.expired;
    if (!isBookable(date, time, new Date(), timeZone)) return showDates(ctx);
    if (!bookingLimiter.hit(String(ctx.from.id))) return t.bookingLimit;
    ctx.s.booking = {};
    await staff.startBooking({
      id: store.newId(),
      userId: ctx.from.id,
      chatId: ctx.chat.id,
      lang: ctx.s.lang,
      date,
      time,
      guests,
      name: cleanText(ctx.from.first_name, TEXT_LIMITS.name) ?? '—',
      status: 'pending',
      createdAt: Date.now(),
      customerMessageId: ctx.callbackQuery?.message?.message_id,
    });
    return t.bookingPlaced;
  });

  return composer;
}
