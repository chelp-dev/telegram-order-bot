// Browsing the menu, changing quantities and viewing the cart.
import { Composer, InlineKeyboard } from 'grammy';
import { onButton, show, tr, type BotContext } from '../context.js';
import { MAX_QTY_PER_ITEM, cartCount, cartLines, cartTotal, changeQty } from '../core/cart.js';
import { findCategory, formatMoney, itemsIn } from '../core/catalog.js';
import { CATEGORIES, CURRENCY, type MenuItem } from '../data/menu.js';

/** Screen to redraw after a quantity change: the cart, or a category by id. */
const CART_VIEW = 'cart';

/** One keyboard row per item: [−] [name · qty] [+]. Tapping the name adds one, like [+]. */
function addItemRow(keyboard: InlineKeyboard, ctx: BotContext, item: MenuItem, view: string): void {
  const { cart, lang } = ctx.session;
  const qty = cart[item.id] ?? 0;
  const label = qty > 0 ? `${item.name[lang]} · ${qty}` : item.name[lang];
  keyboard
    .text('−', `q:${item.id}:-:${view}`)
    .text(label, `q:${item.id}:+:${view}`)
    .text('+', `q:${item.id}:+:${view}`)
    .row();
}

async function showCategories(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  const keyboard = new InlineKeyboard();
  for (const category of CATEGORIES) keyboard.text(category.title[ctx.session.lang], `cat:${category.id}`).row();
  keyboard
    .text(t.btnCart(cartCount(ctx.session.cart)), 'nav:cart')
    .row()
    .text(t.btnMainMenu, 'nav:main');
  await show(ctx, t.chooseCategory, keyboard);
}

async function showCategory(ctx: BotContext, categoryId: string): Promise<void> {
  const t = tr(ctx);
  const category = findCategory(categoryId);
  if (!category) {
    await showCategories(ctx);
    return;
  }
  const { lang } = ctx.session;
  const currency = CURRENCY[lang];
  const items = itemsIn(category.id);
  const prices = items.map((item) => `${item.name[lang]} — ${formatMoney(item.price[currency], currency)}`);
  const keyboard = new InlineKeyboard();
  for (const item of items) addItemRow(keyboard, ctx, item, category.id);
  keyboard.text(t.btnBack, 'nav:menu').text(t.btnCart(cartCount(ctx.session.cart)), 'nav:cart');
  await show(ctx, `<b>${category.title[lang]}</b>\n\n${prices.join('\n')}\n\n<i>${t.qtyHint}</i>`, keyboard);
}

async function showCart(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  const { cart, lang } = ctx.session;
  const currency = CURRENCY[lang];
  const lines = cartLines(cart, currency);
  if (lines.length === 0) {
    await show(
      ctx,
      t.cartEmpty,
      new InlineKeyboard().text(t.btnToMenu, 'nav:menu').row().text(t.btnMainMenu, 'nav:main'),
    );
    return;
  }
  const text = [
    `<b>${t.cartTitle}</b>`,
    '',
    ...lines.map((line) => `${line.qty} × ${line.item.name[lang]} — ${formatMoney(line.sum, currency)}`),
    '',
    `<b>${t.total(formatMoney(cartTotal(cart, currency), currency))}</b>`,
  ].join('\n');
  const keyboard = new InlineKeyboard();
  for (const line of lines) addItemRow(keyboard, ctx, line.item, CART_VIEW);
  keyboard
    .text(t.btnCheckout, 'co:start')
    .row()
    .text(t.btnToMenu, 'nav:menu')
    .text(t.btnClear, 'cart:clear')
    .row()
    .text(t.btnMainMenu, 'nav:main');
  await show(ctx, text, keyboard);
}

export function menuFlow(): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  onButton(composer, 'nav:menu', async (ctx) => {
    await showCategories(ctx);
  });

  onButton(composer, /^cat:(\w+)$/, async (ctx, [, categoryId = '']) => {
    await showCategory(ctx, categoryId);
  });

  onButton(composer, 'nav:cart', async (ctx) => {
    await showCart(ctx);
  });

  onButton(composer, 'cart:clear', async (ctx) => {
    ctx.session.cart = {};
    await showCart(ctx);
    return tr(ctx).cartCleared;
  });

  onButton(composer, /^q:(\w+):([+-]):(\w+)$/, async (ctx, [, itemId = '', sign, view = '']) => {
    const atMax = sign === '+' && ctx.session.cart[itemId] === MAX_QTY_PER_ITEM;
    ctx.session.cart = changeQty(ctx.session.cart, itemId, sign === '+' ? 1 : -1);
    if (view === CART_VIEW) await showCart(ctx);
    else await showCategory(ctx, view);
    return atMax ? tr(ctx).maxQty(MAX_QTY_PER_ITEM) : undefined;
  });

  return composer;
}
