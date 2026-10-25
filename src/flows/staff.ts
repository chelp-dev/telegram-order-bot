// Buttons on the staff cards. The rules live in Staff; this only maps button data to calls.
import { Composer } from 'grammy';
import { isOrderStatus } from '../core/status.js';
import { onButton, tr, type BotContext, type Notice } from '../context.js';
import type { Staff, TransitionResult } from '../staff.js';

export function staffFlow(staff: Staff): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  onButton(composer, /^st:(\d+):(\w+)$/, async (ctx, [, id = '', status = '']) => {
    if (!isOrderStatus(status)) return tr(ctx).expired;
    return resultNotice(ctx, await staff.advanceOrder(id, status, ctx.from?.id));
  });

  onButton(composer, /^bs:(\d+):(confirmed|declined)$/, async (ctx, [, id = '', decision]) => {
    const result = await staff.decideBooking(id, decision === 'declined' ? 'declined' : 'confirmed', ctx.from?.id);
    return resultNotice(ctx, result);
  });

  return composer;
}

function resultNotice(ctx: BotContext, result: TransitionResult): Notice {
  if (result === 'expired') return tr(ctx).expired;
  if (result === 'past') return tr(ctx).alreadyPast;
  return undefined;
}
