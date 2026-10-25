// Browsing the menu, changing quantities and viewing the cart.
import { Composer, InlineKeyboard } from 'grammy';
import { MAX_QTY_PER_ITEM, cartCount, cartLines, cartTotal, changeQty } from '../core/cart.js';
import { onButton, show, tr, type BotContext } from '../context.js';
import { CATEGORIES, CURRENCY, findCategory, formatMoney, itemsIn, type MenuItem } from '../menu.js';

/** One keyboard row per item: [−] [name · qty] [+]. `view` tells the handler which screen to redraw. */
function addItemRow(keyboard: InlineKeyboard, ctx: BotContext, item: MenuItem, view: string): void {
  const qty = ctx.s.cart[item.id] ?? 0;
  const label = qty > 0 ? `${item.name[ctx.s.lang]} · ${qty}` : item.name[ctx.s.lang];
  keyboard
    .text('−', `q:${item.id}:-:${view}`)
    .text(label, `q:${item.id}:+:${view}`)
    .text('+', `q:${item.id}:+:${view}`)
    .row();
}

async function showCategories(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  const keyboard = new InlineKeyboard();
  for (const category of CATEGORIES) keyboard.text(category.title[ctx.s.lang], `cat:${category.id}`).row();
  keyboard
    .text(t.btnCart(cartCount(ctx.s.cart)), 'nav:cart')
    .row()
    .text(t.btnMainMenu, 'nav:main');
  await show(ctx, t.chooseCategory, keyboard);
}

async function showCategory(ctx: BotContext, categoryId: string): Promise<void> {
  const t = tr(ctx);
  const category = findCategory(categoryId);
  if (!category) return showCategories(ctx);
  const currency = CURRENCY[ctx.s.lang];
  const items = itemsIn(category.id);
  const prices = items.map((item) => `${item.name[ctx.s.lang]} — ${formatMoney(item.price[currency], currency)}`);
  const keyboard = new InlineKeyboard();
  for (const item of items) addItemRow(keyboard, ctx, item, category.id);
  keyboard.text(t.btnBack, 'nav:menu').text(t.btnCart(cartCount(ctx.s.cart)), 'nav:cart');
  await show(ctx, `<b>${category.title[ctx.s.lang]}</b>\n\n${prices.join('\n')}\n\n<i>${t.qtyHint}</i>`, keyboard);
}

export async function showCart(ctx: BotContext): Promise<void> {
  const t = tr(ctx);
  const currency = CURRENCY[ctx.s.lang];
  const lines = cartLines(ctx.s.cart, currency);
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
    ...lines.map((line) => `${line.qty} × ${line.item.name[ctx.s.lang]} — ${formatMoney(line.sum, currency)}`),
    '',
    `<b>${t.total(formatMoney(cartTotal(ctx.s.cart, currency), currency))}</b>`,
  ].join('\n');
  const keyboard = new InlineKeyboard();
  for (const line of lines) addItemRow(keyboard, ctx, line.item, 'cart');
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
    ctx.s.cart = {};
    await showCart(ctx);
    return tr(ctx).cartCleared;
  });

  onButton(composer, /^q:(\w+):([+-]):(\w+)$/, async (ctx, [, itemId = '', sign, view = '']) => {
    const atMax = sign === '+' && ctx.s.cart[itemId] === MAX_QTY_PER_ITEM;
    ctx.s.cart = changeQty(ctx.s.cart, itemId, sign === '+' ? 1 : -1);
    if (view === 'cart') await showCart(ctx);
    else await showCategory(ctx, view);
    return atMax ? tr(ctx).maxQty(MAX_QTY_PER_ITEM) : undefined;
  });

  return composer;
}
