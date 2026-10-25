// Table booking: date -> time -> guests -> confirm. Buttons only, so every step
// re-validates what it receives instead of trusting the session.
import { Composer, InlineKeyboard } from 'grammy';
import type { BotConfig } from '../config.js';
import { onButton, show, tr, type BotContext, type Notice } from '../context.js';
import type { RateLimiter } from '../core/rateLimit.js';
import { availableSlots, bookableDates, formatDate, isBookable } from '../core/schedule.js';
import { cleanText, TEXT_LIMITS } from '../core/validate.js';
import { GUEST_OPTIONS } from '../data/booking.js';
import type { Staff } from '../staff.js';
import type { Store } from '../store.js';
import { bookingDetails } from './cards.js';

interface BookingDeps {
  store: Store;
  staff: Staff;
  bookingLimiter: RateLimiter;
  config: BotConfig;
}

interface GridButton {
  label: string;
  data: string;
}

/** Lays out buttons in rows of `perRow`. */
function grid(buttons: GridButton[], perRow: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  buttons.forEach((button, i) => {
    keyboard.text(button.label, button.data);
    if ((i + 1) % perRow === 0 || i === buttons.length - 1) keyboard.row();
  });
  return keyboard;
}

export function bookingFlow({ store, staff, bookingLimiter, config }: BookingDeps): Composer<BotContext> {
  const composer = new Composer<BotContext>();
  const { timeZone } = config;

  async function showDates(ctx: BotContext): Promise<Notice> {
    const t = tr(ctx);
    const dates = bookableDates(new Date(), timeZone);
    if (dates.length === 0) return t.noSlots;
    ctx.session.booking = {};
    const keyboard = grid(
      dates.map((date) => ({ label: formatDate(date, t.locale), data: `bk:d:${date}` })),
      2,
    );
    await show(ctx, t.chooseDate, keyboard.text(t.btnMainMenu, 'nav:main'));
  }

  async function showTimes(ctx: BotContext, date: string): Promise<Notice> {
    const t = tr(ctx);
    const now = new Date();
    const slots = bookableDates(now, timeZone).includes(date) ? availableSlots(date, now, timeZone) : [];
    if (slots.length === 0) return showDates(ctx);
    ctx.session.booking = { date };
    const keyboard = grid(
      slots.map((slot) => ({ label: slot, data: `bk:t:${slot.replace(':', '')}` })),
      4,
    );
    await show(ctx, t.chooseTime(formatDate(date, t.locale)), keyboard.text(t.btnBack, 'nav:book'));
  }

  onButton(composer, 'nav:book', showDates);

  onButton(composer, /^bk:d:(\d{4}-\d{2}-\d{2})$/, (ctx, [, date = '']) => showTimes(ctx, date));

  onButton(composer, /^bk:t:(\d{2})(\d{2})$/, async (ctx, [, hh = '', mm = '']) => {
    const t = tr(ctx);
    const { date } = ctx.session.booking;
    const time = `${hh}:${mm}`;
    if (!date || !isBookable(date, time, new Date(), timeZone)) return showDates(ctx);
    ctx.session.booking = { date, time };
    const keyboard = grid(
      GUEST_OPTIONS.map((n) => ({ label: String(n), data: `bk:g:${n}` })),
      GUEST_OPTIONS.length,
    );
    await show(ctx, t.chooseGuests(formatDate(date, t.locale), time), keyboard.text(t.btnBack, `bk:d:${date}`));
  });

  onButton(composer, /^bk:g:(\d+)$/, async (ctx, [, count]) => {
    const t = tr(ctx);
    const guests = Number(count);
    const { date, time } = ctx.session.booking;
    if (!date || !time || !(GUEST_OPTIONS as readonly number[]).includes(guests)) return showDates(ctx);
    ctx.session.booking = { date, time, guests };
    const keyboard = new InlineKeyboard().text(t.btnConfirm, 'bk:ok').text(t.btnCancel, 'nav:main');
    await show(ctx, `<b>${t.bookingSummary}</b>\n\n${bookingDetails(t, { date, time, guests })}`, keyboard);
  });

  onButton(composer, 'bk:ok', async (ctx) => {
    const t = tr(ctx);
    const { date, time, guests } = ctx.session.booking;
    if (!date || !time || !guests || !ctx.chat || !ctx.from) return t.expired;
    if (!isBookable(date, time, new Date(), timeZone)) return showDates(ctx);
    if (!bookingLimiter.hit(String(ctx.from.id))) return t.bookingLimit;
    ctx.session.booking = {};
    await staff.startBooking({
      id: store.newId(),
      userId: ctx.from.id,
      chatId: ctx.chat.id,
      lang: ctx.session.lang,
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
