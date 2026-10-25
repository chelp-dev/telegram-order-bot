import { GrammyError, type Composer, type Context, type InlineKeyboard } from 'grammy';
import { dict, type Dict } from './i18n/index.js';
import type { Session } from './store.js';

export type BotContext = Context & { session: Session };

/** A short notice shown as a toast when a button handler returns it. */
export type Notice = string | undefined;

export function tr(ctx: BotContext): Dict {
  return dict[ctx.session.lang];
}

export const HTML = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } } as const;

export function isNotModified(error: unknown): boolean {
  return error instanceof GrammyError && error.description.includes('message is not modified');
}

/**
 * True when an edit failed because the message itself is unusable (deleted, too old, not a text
 * message), so sending a fresh one is the right fallback. Rate limits and network errors are not:
 * retrying them as a new message would leave duplicate cards in the chat.
 */
export function shouldSendInstead(error: unknown): boolean {
  return error instanceof GrammyError && error.error_code === 400 && !isNotModified(error);
}

/**
 * Shows a screen: edits the message the button belongs to, or sends a new message
 * when the update is not a button press or the old message can no longer be edited.
 */
export async function show(ctx: BotContext, text: string, keyboard?: InlineKeyboard): Promise<void> {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
      return;
    } catch (error) {
      if (isNotModified(error)) return;
      if (!shouldSendInstead(error)) throw error;
    }
  }
  await ctx.reply(text, { ...HTML, reply_markup: keyboard });
}

/**
 * Registers a button handler. The handler may return a notice, shown as a toast.
 * The callback query is answered even if the handler throws, so the button never keeps spinning.
 */
export function onButton(
  composer: Composer<BotContext>,
  trigger: string | RegExp,
  handler: (ctx: BotContext, match: string[]) => Promise<Notice>,
): void {
  composer.callbackQuery(trigger, async (ctx) => {
    const match = typeof ctx.match === 'string' ? [ctx.match] : Array.from(ctx.match);
    let notice: Notice;
    try {
      notice = await handler(ctx, match);
    } finally {
      await answer(ctx, notice);
    }
  });
}

/** Answers a callback query; a failure here (e.g. the query is too old) is harmless and ignored. */
export async function answer(ctx: BotContext, text?: string): Promise<void> {
  await ctx.answerCallbackQuery(text ? { text } : undefined).catch(() => undefined);
}
