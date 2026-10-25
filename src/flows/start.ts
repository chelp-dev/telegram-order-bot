// Main menu, language switch, "about", and the fallback for anything no other flow handled.
import { Composer, InlineKeyboard } from 'grammy';
import type { BotConfig } from '../config.js';
import { answer, HTML, onButton, show, tr, type BotContext } from '../context.js';
import { cartCount } from '../core/cart.js';
import { escapeHtml } from '../core/validate.js';
import { otherLang } from '../i18n/index.js';

export function mainKeyboard(ctx: BotContext): InlineKeyboard {
  const t = tr(ctx);
  return new InlineKeyboard()
    .text(t.btnMenu, 'nav:menu')
    .text(t.btnCart(cartCount(ctx.session.cart)), 'nav:cart')
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

export function startFlow(config: BotConfig): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // A half-finished checkout is left by checkoutGuard() before these run.
  composer.command(['start', 'cancel'], showMain);

  composer.command('lang', async (ctx) => {
    ctx.session.lang = otherLang(ctx.session.lang);
    await showMain(ctx);
  });

  onButton(composer, 'lang', async (ctx) => {
    ctx.session.lang = otherLang(ctx.session.lang);
    await showMain(ctx);
    return tr(ctx).langSwitched;
  });

  onButton(composer, 'nav:main', async (ctx) => {
    await showMain(ctx);
  });

  onButton(composer, 'nav:about', async (ctx) => {
    const t = tr(ctx);
    await show(
      ctx,
      t.about(escapeHtml(config.siteUrl), escapeHtml(config.repoUrl)),
      new InlineKeyboard().text(t.btnBack, 'nav:main'),
    );
  });

  return composer;
}

/** Stale buttons (e.g. from before a restart) and stray messages. */
export function fallbackFlow(): Composer<BotContext> {
  const composer = new Composer<BotContext>();
  composer.on('callback_query', (ctx) => answer(ctx, tr(ctx).expired));
  composer.on('message', async (ctx) => {
    await ctx.reply(tr(ctx).useButtons, { ...HTML, reply_markup: mainKeyboard(ctx) });
  });
  return composer;
}
