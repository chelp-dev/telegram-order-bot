// Text and buttons for order and booking cards, as seen by the customer and by the staff.
import { InlineKeyboard } from 'grammy';
import { remainingStatuses, type OrderStatus } from '../core/status.js';
import { formatDate } from '../core/schedule.js';
import { escapeHtml } from '../core/validate.js';
import { dict, type Dict } from '../i18n/index.js';
import { formatMoney } from '../menu.js';
import type { Booking, Fulfilment, Order, OrderLine } from '../store.js';
import type { Currency } from '../menu.js';

export interface Card {
  text: string;
  keyboard?: InlineKeyboard;
}

export interface OrderDetails {
  currency: Currency;
  lines: OrderLine[];
  total: number;
  fulfilment: Fulfilment;
  name: string;
  phone: string;
  address?: string;
  comment?: string;
}

export function orderStatusLabel(t: Dict, status: OrderStatus, fulfilment: Fulfilment): string {
  return status === 'on_the_way' && fulfilment === 'pickup' ? t.status_ready : t[`status_${status}`];
}

/** Items, total and contact details; shared by the checkout summary and both order cards. */
export function orderDetails(t: Dict, order: OrderDetails): string {
  const items = order.lines.map(
    (line) => `${line.qty} × ${escapeHtml(line.name)} — ${formatMoney(line.sum, order.currency)}`,
  );
  const contact = [
    order.fulfilment === 'delivery' ? t.delivery : t.pickup,
    `${t.labelName}: ${escapeHtml(order.name)}`,
    `${t.labelPhone}: ${escapeHtml(order.phone)}`,
  ];
  if (order.address) contact.push(`${t.labelAddress}: ${escapeHtml(order.address)}`);
  if (order.comment) contact.push(`${t.labelComment}: ${escapeHtml(order.comment)}`);
  return [...items, `<b>${t.total(formatMoney(order.total, order.currency))}</b>`, '', ...contact].join('\n');
}

export function customerOrderCard(order: Order): Card {
  const t = dict[order.lang];
  const status = orderStatusLabel(t, order.status, order.fulfilment);
  const footer = order.status === 'done' ? t.customerDone : `<i>${t.customerHint}</i>`;
  return {
    text: `<b>${t.cafeName}</b>\n<b>${t.orderTitle(order.id)}</b>\n\n${orderDetails(t, order)}\n\n${t.statusLabel}: <b>${status}</b>\n${footer}`,
  };
}

export function staffOrderCard(order: Order, autoAdvanceMs: number): Card {
  const t = dict[order.lang];
  const status = orderStatusLabel(t, order.status, order.fulfilment);
  const buttonLabel: Record<Exclude<OrderStatus, 'new'>, string> = {
    accepted: t.btnAccept,
    cooking: t.btnCooking,
    on_the_way: order.fulfilment === 'pickup' ? t.btnReady : t.btnOnTheWay,
    done: t.btnDone,
  };
  const remaining = remainingStatuses(order.status).filter((s): s is Exclude<OrderStatus, 'new'> => s !== 'new');
  const keyboard = new InlineKeyboard();
  remaining.forEach((s, i) => {
    keyboard.text(buttonLabel[s], `st:${order.id}:${s}`);
    if (i % 2 === 1) keyboard.row();
  });
  const note =
    remaining.length > 0 && autoAdvanceMs > 0 ? `\n\n<i>${t.staffDemoNote(Math.round(autoAdvanceMs / 1000))}</i>` : '';
  return {
    text: `<i>${t.staffBanner}</i>\n\n<b>${t.staffNewOrder} · ${t.orderTitle(order.id)}</b>\n\n${orderDetails(t, order)}\n\n${t.statusLabel}: <b>${status}</b>${note}`,
    keyboard: remaining.length > 0 ? keyboard : undefined,
  };
}

export function bookingDetails(t: Dict, booking: Pick<Booking, 'date' | 'time' | 'guests'>): string {
  return [
    `${t.labelDate}: ${formatDate(booking.date, t.locale)}`,
    `${t.labelTime}: ${booking.time}`,
    `${t.labelGuests}: ${booking.guests}`,
  ].join('\n');
}

export function customerBookingCard(booking: Booking): Card {
  const t = dict[booking.lang];
  const hint = { pending: '', confirmed: `\n${t.bookingConfirmedHint}`, declined: `\n${t.bookingDeclinedHint}` }[
    booking.status
  ];
  return {
    text: `<b>${t.cafeName}</b>\n<b>${t.bookingTitle(booking.id)}</b>\n\n${bookingDetails(t, booking)}\n\n${t.statusLabel}: <b>${t[`booking_${booking.status}`]}</b>${hint}`,
  };
}

export function staffBookingCard(booking: Booking, autoAdvanceMs: number): Card {
  const t = dict[booking.lang];
  const pending = booking.status === 'pending';
  const note = pending && autoAdvanceMs > 0 ? `\n\n<i>${t.staffDemoNote(Math.round(autoAdvanceMs / 1000))}</i>` : '';
  return {
    text:
      `<i>${t.staffBanner}</i>\n\n<b>${t.staffNewBooking} · ${t.bookingTitle(booking.id)}</b>\n\n` +
      `${t.labelName}: ${escapeHtml(booking.name)}\n${bookingDetails(t, booking)}\n\n` +
      `${t.statusLabel}: <b>${t[`booking_${booking.status}`]}</b>${note}`,
    keyboard: pending
      ? new InlineKeyboard()
          .text(t.btnApprove, `bs:${booking.id}:confirmed`)
          .text(t.btnDecline, `bs:${booking.id}:declined`)
      : undefined,
  };
}
