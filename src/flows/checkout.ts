// Checkout as a small explicit state machine (Session.step):
// fulfilment -> name -> phone -> [address] -> comment -> confirm.
import { Composer, InlineKeyboard, Keyboard } from 'grammy';
import { cartCount, cartLines, cartTotal } from '../core/cart.js';
import type { RateLimiter } from '../core/rateLimit.js';
import { TEXT_LIMITS, cleanText, escapeHtml, normalizePhone } from '../core/validate.js';
import { HTML, onButton, show, tr, type BotContext } from '../context.js';
import { CURRENCY } from '../menu.js';
import type { Order, Store } from '../store.js';
import { orderDetails } from './cards.js';
import { showMain } from './start.js';
import type { Staff } from './staff.js';

interface CheckoutDeps {
  store: Store;
  staff: Staff;
  orderLimiter: RateLimiter;
}

async function askName(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  ctx.s.step = 'name';
  const firstName = cleanText(ctx.from?.first_name ?? '', TEXT_LIMITS.name);
  await show(ctx, t.askName, firstName ? new InlineKeyboard().text(t.btnUseName(firstName), 'co:tgname') : undefined);
}

async function askPhone(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  ctx.s.step = 'phone';
  const keyboard = new Keyboard().requestContact(t.btnSharePhone).resized().oneTime();
  await ctx.reply(t.askPhone, { reply_markup: keyboard });
}

async function acceptPhone(ctx: BotContext, phone: string): Promise<void> {
  const t = tr(ctx);
  ctx.s.checkout.phone = phone;
  await ctx.reply(t.phoneSaved(escapeHtml(phone)), { ...HTML, reply_markup: { remove_keyboard: true } });
  if (ctx.s.checkout.fulfilment === 'delivery') {
    ctx.s.step = 'address';
    await ctx.reply(t.askAddress);
  } else {
    await askComment(ctx);
  }
}

async function askComment(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  ctx.s.step = 'comment';
  await ctx.reply(t.askComment, { reply_markup: new InlineKeyboard().text(t.btnSkip, 'co:skip') });
}

/** Builds the order from the session, or returns undefined if the draft is incomplete or the cart is empty. */
function draftOrder(ctx: BotContext, store: Store): Order | undefined {
  const { checkout, cart, lang } = ctx.s;
  const { fulfilment, name, phone, address, comment } = checkout;
  const currency = CURRENCY[lang];
  if (!fulfilment || !name || !phone || (fulfilment === 'delivery' && !address) || cartCount(cart) === 0) return undefined;
  if (!ctx.chat || !ctx.from) return undefined;
  return {
    id: store.newId(),
    userId: ctx.from.id,
    chatId: ctx.chat.id,
    lang,
    currency,
    lines: cartLines(cart, currency).map((line) => ({ name: line.item.name[lang], qty: line.qty, sum: line.sum })),
    total: cartTotal(cart, currency),
    fulfilment,
    name,
    phone,
    address: fulfilment === 'delivery' ? address : undefined,
    comment,
    status: 'new',
    createdAt: Date.now(),
  };
}

async function showSummary(ctx: BotContext, store: Store): Promise<void> {
  const t = tr(ctx);
  const order = draftOrder(ctx, store);
  if (!order) {
    ctx.s.step = 'idle';
    await showMain(ctx);
    return;
  }
  ctx.s.step = 'confirm';
  const keyboard = new InlineKeyboard().text(t.btnConfirm, 'co:ok').text(t.btnCancel, 'co:cancel');
  await show(ctx, `<b>${t.summaryTitle}</b>\n\n${orderDetails(t, order)}`, keyboard);
}

export function checkoutFlow({ store, staff, orderLimiter }: CheckoutDeps): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  onButton(composer, 'co:start', async (ctx) => {
    const t = tr(ctx);
    if (cartCount(ctx.s.cart) === 0) return t.cartEmpty;
    ctx.s.step = 'idle';
    ctx.s.checkout = {};
    const keyboard = new InlineKeyboard()
      .text(t.btnDelivery, 'co:delivery')
      .text(t.btnPickup, 'co:pickup')
      .row()
      .text(t.btnBack, 'nav:cart');
    await show(ctx, t.askFulfilment, keyboard);
  });

  onButton(composer, /^co:(delivery|pickup)$/, async (ctx, [, fulfilment]) => {
    if (cartCount(ctx.s.cart) === 0) return tr(ctx).cartEmpty;
    ctx.s.checkout = { fulfilment: fulfilment === 'delivery' ? 'delivery' : 'pickup' };
    await askName(ctx);
  });

  onButton(composer, 'co:tgname', async (ctx) => {
    const name = cleanText(ctx.from?.first_name ?? '', TEXT_LIMITS.name);
    if (ctx.s.step !== 'name' || !name) return tr(ctx).expired;
    ctx.s.checkout.name = name;
    await ctx.editMessageReplyMarkup().catch(() => undefined);
    await askPhone(ctx);
  });

  onButton(composer, 'co:skip', async (ctx) => {
    if (ctx.s.step !== 'comment') return tr(ctx).expired;
    ctx.s.checkout.comment = undefined;
    await showSummary(ctx, store);
  });

  onButton(composer, 'co:cancel', async (ctx) => {
    ctx.s.step = 'idle';
    ctx.s.checkout = {};
    await showMain(ctx);
    return tr(ctx).cancelled;
  });

  onButton(composer, 'co:ok', async (ctx) => {
    const t = tr(ctx);
    const order = ctx.s.step === 'confirm' ? draftOrder(ctx, store) : undefined;
    if (!order) return t.expired;
    if (!orderLimiter.hit(String(order.userId))) return t.orderLimit;
    order.customerMessageId = ctx.callbackQuery?.message?.message_id;
    ctx.s.step = 'idle';
    ctx.s.cart = {};
    ctx.s.checkout = {};
    await staff.startOrder(order);
    return t.orderPlaced;
  });

  composer.on('message:contact', async (ctx, next) => {
    if (ctx.s.step !== 'phone') return next();
    const phone = normalizePhone(ctx.message.contact.phone_number);
    if (!phone) return void (await ctx.reply(tr(ctx).badPhone));
    await acceptPhone(ctx, phone);
  });

  composer.on('message:text', async (ctx, next) => {
    const t = tr(ctx);
    const text = ctx.message.text;
    switch (ctx.s.step) {
      case 'name': {
        const name = cleanText(text, TEXT_LIMITS.name);
        if (!name) return void (await ctx.reply(t.tooLong(TEXT_LIMITS.name)));
        ctx.s.checkout.name = name;
        return askPhone(ctx);
      }
      case 'phone': {
        const phone = normalizePhone(text);
        if (!phone) return void (await ctx.reply(t.badPhone));
        return acceptPhone(ctx, phone);
      }
      case 'address': {
        const address = cleanText(text, TEXT_LIMITS.address);
        if (!address) return void (await ctx.reply(t.tooLong(TEXT_LIMITS.address)));
        ctx.s.checkout.address = address;
        return askComment(ctx);
      }
      case 'comment': {
        const comment = cleanText(text, TEXT_LIMITS.comment);
        if (!comment) return void (await ctx.reply(t.tooLong(TEXT_LIMITS.comment)));
        ctx.s.checkout.comment = comment;
        return showSummary(ctx, store);
      }
      default:
        return next();
    }
  });

  return composer;
}
