import { Composer, InlineKeyboard } from 'grammy';
import { cartCount } from '../core/cart.js';
import { escapeHtml } from '../core/validate.js';
import { HTML, onButton, show, tr, type BotConfig, type BotContext } from '../context.js';
import { otherLang } from '../i18n/index.js';

export function mainKeyboard(ctx: BotContext): InlineKeyboard {
  const t = tr(ctx);
  return new InlineKeyboard()
    .text(t.btnMenu, 'nav:menu')
    .text(t.btnCart(cartCount(ctx.s.cart)), 'nav:cart')
    .row()
    .text(t.btnBook, 'nav:book')
    .row()
    .text(t.btnAbout, 'nav:about')
    .text(t.btnLang, 'lang');
}

export async function showMain(ctx: BotContext): Promise<void> {
  const name = escapeHtml(ctx.from?.first_name ?? '');
  await show(ctx, tr(ctx).welcome(name), mainKeyboard(ctx));
}

/** Leaves any half-finished checkout and hides the contact-share keyboard if it is open. */
async function resetConversation(ctx: BotContext): Promise<void> {
  const hadReplyKeyboard = ctx.s.step === 'phone';
  ctx.s.step = 'idle';
  ctx.s.checkout = {};
  if (hadReplyKeyboard) await ctx.reply(tr(ctx).cancelled, { reply_markup: { remove_keyboard: true } });
}

export function startFlow(config: BotConfig): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.command('start', async (ctx) => {
    await resetConversation(ctx);
    await showMain(ctx);
  });

  composer.command('cancel', async (ctx) => {
    await resetConversation(ctx);
    await showMain(ctx);
  });

  composer.command('lang', async (ctx) => {
    ctx.s.lang = otherLang(ctx.s.lang);
    await showMain(ctx);
  });

  onButton(composer, 'lang', async (ctx) => {
    ctx.s.lang = otherLang(ctx.s.lang);
    await showMain(ctx);
    return tr(ctx).langSwitched;
  });

  onButton(composer, 'nav:main', async (ctx) => {
    await showMain(ctx);
  });

  onButton(composer, 'nav:about', async (ctx) => {
    const t = tr(ctx);
    await show(ctx, t.about(config.siteUrl, config.repoUrl), new InlineKeyboard().text(t.btnBack, 'nav:main'));
  });

  return composer;
}

/** Fallback for anything no flow handled: stale buttons and stray messages. */
export function fallbackFlow(): Composer<BotContext> {
  const composer = new Composer<BotContext>();
  composer.on('callback_query', async (ctx) => {
    await ctx.answerCallbackQuery({ text: tr(ctx).expired }).catch(() => undefined);
  });
  composer.on('message', async (ctx) => {
    await ctx.reply(tr(ctx).useButtons, { ...HTML, reply_markup: mainKeyboard(ctx) });
  });
  return composer;
}
