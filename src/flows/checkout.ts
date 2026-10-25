// Checkout as a small explicit state machine (Session.step):
// fulfilment -> name -> phone -> [address] -> comment -> confirm.
import { Composer, InlineKeyboard, Keyboard } from 'grammy';
import { HTML, onButton, show, tr, type BotContext } from '../context.js';
import { cartCount, cartLines, cartTotal } from '../core/cart.js';
import type { RateLimiter } from '../core/rateLimit.js';
import { TEXT_LIMITS, cleanText, escapeHtml, normalizePhone } from '../core/validate.js';
import { CURRENCY } from '../data/menu.js';
import type { Staff } from '../staff.js';
import type { Session, Store } from '../store.js';
import { orderDetails, type OrderDetails } from './cards.js';
import { showMain } from './start.js';

interface CheckoutDeps {
  store: Store;
  staff: Staff;
  orderLimiter: RateLimiter;
}

/** Button prefixes that belong to checkout, or may be pressed in the middle of it without leaving it. */
const CHECKOUT_SAFE_BUTTONS = /^(co:|st:|bs:|lang$)/;

/** Ends a half-finished checkout and hides the contact-share keyboard if it is open. */
async function leaveCheckout(ctx: BotContext): Promise<void> {
  const hadReplyKeyboard = ctx.session.step === 'phone';
  ctx.session.step = 'idle';
  ctx.session.checkout = {};
  if (hadReplyKeyboard) await ctx.reply(tr(ctx).cancelled, { reply_markup: { remove_keyboard: true } });
}

/**
 * Leaves checkout when the user navigates elsewhere (another button or a command other than /lang).
 * Without this, a user who tapped "Main menu" while asked for a name would have their next message
 * taken as the name.
 */
export function checkoutGuard(): Composer<BotContext> {
  const composer = new Composer<BotContext>();
  composer.use(async (ctx, next) => {
    if (ctx.session.step !== 'idle') {
      const data = ctx.callbackQuery?.data;
      const text = ctx.message?.text;
      const navigatesAway =
        (data !== undefined && !CHECKOUT_SAFE_BUTTONS.test(data)) ||
        (text !== undefined && text.startsWith('/') && !/^\/lang(@\w+)?$/.test(text));
      if (navigatesAway) await leaveCheckout(ctx);
    }
    await next();
  });
  return composer;
}

async function askName(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  ctx.session.step = 'name';
  const firstName = cleanText(ctx.from?.first_name ?? '', TEXT_LIMITS.name);
  await show(ctx, t.askName, firstName ? new InlineKeyboard().text(t.btnUseName(firstName), 'co:tgname') : undefined);
}

async function askPhone(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  ctx.session.step = 'phone';
  const keyboard = new Keyboard().requestContact(t.btnSharePhone).resized().oneTime();
  await ctx.reply(t.askPhone, { reply_markup: keyboard });
}

async function acceptPhone(ctx: BotContext, phone: string): Promise<void> {
  const t = tr(ctx);
  ctx.session.checkout.phone = phone;
  await ctx.reply(t.phoneSaved(escapeHtml(phone)), { ...HTML, reply_markup: { remove_keyboard: true } });
  if (ctx.session.checkout.fulfilment === 'delivery') {
    ctx.session.step = 'address';
    await ctx.reply(t.askAddress);
  } else {
    await askComment(ctx);
  }
}

async function askComment(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  ctx.session.step = 'comment';
  await ctx.reply(t.askComment, { reply_markup: new InlineKeyboard().text(t.btnSkip, 'co:skip') });
}

/** The order as the session describes it, or undefined if the draft is incomplete or the cart is empty. */
function draftOrder(session: Session): OrderDetails | undefined {
  const { checkout, cart, lang } = session;
  const { fulfilment, name, phone, address, comment } = checkout;
  if (!fulfilment || !name || !phone || cartCount(cart) === 0) return undefined;
  if (fulfilment === 'delivery' && !address) return undefined;
  const currency = CURRENCY[lang];
  return {
    currency,
    lines: cartLines(cart, currency).map((line) => ({ name: line.item.name[lang], qty: line.qty, sum: line.sum })),
    total: cartTotal(cart, currency),
    fulfilment,
    name,
    phone,
    address: fulfilment === 'delivery' ? address : undefined,
    comment,
  };
}

async function showSummary(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  const draft = draftOrder(ctx.session);
  if (!draft) {
    ctx.session.step = 'idle';
    await showMain(ctx);
    return;
  }
  ctx.session.step = 'confirm';
  const keyboard = new InlineKeyboard().text(t.btnConfirm, 'co:ok').text(t.btnCancel, 'co:cancel');
  await show(ctx, `<b>${t.summaryTitle}</b>\n\n${orderDetails(t, draft)}`, keyboard);
}

export function checkoutFlow({ store, staff, orderLimiter }: CheckoutDeps): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  onButton(composer, 'co:start', async (ctx) => {
    const t = tr(ctx);
    if (cartCount(ctx.session.cart) === 0) return t.cartEmpty;
    ctx.session.step = 'idle';
    ctx.session.checkout = {};
    const keyboard = new InlineKeyboard()
      .text(t.btnDelivery, 'co:delivery')
      .text(t.btnPickup, 'co:pickup')
      .row()
      .text(t.btnBack, 'nav:cart');
    await show(ctx, t.askFulfilment, keyboard);
  });

  onButton(composer, /^co:(delivery|pickup)$/, async (ctx, [, fulfilment]) => {
    if (cartCount(ctx.session.cart) === 0) return tr(ctx).cartEmpty;
    ctx.session.checkout = { fulfilment: fulfilment === 'delivery' ? 'delivery' : 'pickup' };
    await askName(ctx);
  });

  onButton(composer, 'co:tgname', async (ctx) => {
    const name = cleanText(ctx.from?.first_name ?? '', TEXT_LIMITS.name);
    if (ctx.session.step !== 'name' || !name) return tr(ctx).expired;
    ctx.session.checkout.name = name;
    await ctx.editMessageReplyMarkup().catch(() => undefined);
    await askPhone(ctx);
  });

  onButton(composer, 'co:skip', async (ctx) => {
    if (ctx.session.step !== 'comment') return tr(ctx).expired;
    ctx.session.checkout.comment = undefined;
    await showSummary(ctx);
  });

  onButton(composer, 'co:cancel', async (ctx) => {
    ctx.session.step = 'idle';
    ctx.session.checkout = {};
    await showMain(ctx);
    return tr(ctx).cancelled;
  });

  onButton(composer, 'co:ok', async (ctx) => {
    const t = tr(ctx);
    const draft = ctx.session.step === 'confirm' ? draftOrder(ctx.session) : undefined;
    if (!draft || !ctx.chat || !ctx.from) return t.expired;
    if (!orderLimiter.hit(String(ctx.from.id))) return t.orderLimit;
    const { lang } = ctx.session;
    ctx.session.step = 'idle';
    ctx.session.cart = {};
    ctx.session.checkout = {};
    await staff.startOrder({
      ...draft,
      id: store.newId(),
      userId: ctx.from.id,
      chatId: ctx.chat.id,
      lang,
      status: 'new',
      createdAt: Date.now(),
      customerMessageId: ctx.callbackQuery?.message?.message_id,
    });
    return t.orderPlaced;
  });

  composer.on('message:contact', async (ctx, next) => {
    if (ctx.session.step !== 'phone') return next();
    const phone = normalizePhone(ctx.message.contact.phone_number);
    if (phone) await acceptPhone(ctx, phone);
    else await ctx.reply(tr(ctx).badPhone);
  });

  composer.on('message:text', async (ctx, next) => {
    const t = tr(ctx);
    const text = ctx.message.text;
    switch (ctx.session.step) {
      case 'name': {
        const name = cleanText(text, TEXT_LIMITS.name);
        if (!name) return ctx.reply(t.tooLong(TEXT_LIMITS.name));
        ctx.session.checkout.name = name;
        return askPhone(ctx);
      }
      case 'phone': {
        const phone = normalizePhone(text);
        if (!phone) return ctx.reply(t.badPhone);
        return acceptPhone(ctx, phone);
      }
      case 'address': {
        const address = cleanText(text, TEXT_LIMITS.address);
        if (!address) return ctx.reply(t.tooLong(TEXT_LIMITS.address));
        ctx.session.checkout.address = address;
        return askComment(ctx);
      }
      case 'comment': {
        const comment = cleanText(text, TEXT_LIMITS.comment);
        if (!comment) return ctx.reply(t.tooLong(TEXT_LIMITS.comment));
        ctx.session.checkout.comment = comment;
        return showSummary(ctx);
      }
      default:
        return next();
    }
  });

  return composer;
}
