import { GrammyError, type Composer, type Context, type InlineKeyboard } from 'grammy';
import { dict, type Dict } from './i18n/index.js';
import type { Session } from './store.js';

export type BotContext = Context & { s: Session };

export interface BotConfig {
  /** How often the demo advances an order by itself. 0 disables auto-advance. */
  autoAdvanceMs: number;
  /** The cafe's time zone, used for booking dates and slots. */
  timeZone: string;
  siteUrl: string;
  repoUrl: string;
}

export function tr(ctx: BotContext): Dict {
  return dict[ctx.s.lang];
}

export const HTML = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } } as const;

export function isNotModified(error: unknown): boolean {
  return error instanceof GrammyError && error.description.includes('message is not modified');
}

/**
 * Shows a screen: edits the message the button belongs to, or sends a new message
 * when the update is not a button press (or the old message can no longer be edited).
 */
export async function show(ctx: BotContext, text: string, keyboard?: InlineKeyboard): Promise<void> {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
      return;
    } catch (error) {
      if (isNotModified(error)) return;
    }
  }
  await ctx.reply(text, { ...HTML, reply_markup: keyboard });
}

/**
 * Registers a button handler. The handler may return a short notice, shown as a toast;
 * the callback query is always answered so the button stops spinning.
 */
export function onButton(
  composer: Composer<BotContext>,
  trigger: string | RegExp,
  handler: (ctx: BotContext, match: string[]) => Promise<string | undefined>,
): void {
  composer.callbackQuery(trigger, async (ctx) => {
    const match = typeof ctx.match === 'string' ? [ctx.match] : Array.from(ctx.match);
    const notice = await handler(ctx, match);
    await ctx.answerCallbackQuery(notice ? { text: notice } : undefined).catch(() => undefined);
  });
}
