// The "kitchen/owner" side of the demo. In a real deployment the staff card would go to
// the cafe's own chat; here the customer receives it too, so they can see the whole loop.
import { Composer, type Api } from 'grammy';
import { canAdvance, canDecide, isOrderStatus, nextStatus, type OrderStatus } from '../core/status.js';
import { HTML, isNotModified, onButton, tr, type BotContext } from '../context.js';
import type { Booking, Order, Store } from '../store.js';
import { customerBookingCard, customerOrderCard, staffBookingCard, staffOrderCard, type Card } from './cards.js';

export type TransitionResult = 'ok' | 'expired' | 'past';

type MessagingApi = Pick<Api, 'sendMessage' | 'editMessageText'>;

export class Staff {
  constructor(
    private readonly api: MessagingApi,
    private readonly store: Store,
    private readonly autoAdvanceMs: number,
  ) {}

  /** Registers a confirmed order, shows both cards and starts the demo timer. */
  async startOrder(order: Order): Promise<void> {
    this.store.orders.set(order.id, order);
    await this.renderOrder(order);
    this.scheduleOrder(order);
  }

  /** `byUserId` limits the change to the user the order belongs to (button presses); timers omit it. */
  async advanceOrder(id: string, to: OrderStatus, byUserId?: number): Promise<TransitionResult> {
    const order = this.store.orders.get(id);
    if (!order || (byUserId !== undefined && order.userId !== byUserId)) return 'expired';
    if (!canAdvance(order.status, to)) return 'past';
    order.status = to;
    this.scheduleOrder(order);
    await this.renderOrder(order);
    return 'ok';
  }

  async startBooking(booking: Booking): Promise<void> {
    this.store.bookings.set(booking.id, booking);
    await this.renderBooking(booking);
    this.schedule(booking, () => this.decideBooking(booking.id, 'confirmed'));
  }

  async decideBooking(id: string, decision: 'confirmed' | 'declined', byUserId?: number): Promise<TransitionResult> {
    const booking = this.store.bookings.get(id);
    if (!booking || (byUserId !== undefined && booking.userId !== byUserId)) return 'expired';
    if (!canDecide(booking.status)) return 'past';
    booking.status = decision;
    clearTimeout(booking.timer);
    await this.renderBooking(booking);
    return 'ok';
  }

  /** Each staff action restarts the countdown, so the next automatic step never lands right after a click. */
  private scheduleOrder(order: Order): void {
    const next = nextStatus(order.status);
    clearTimeout(order.timer);
    if (next) {
      this.schedule(order, () => this.advanceOrder(order.id, next));
    }
  }

  private schedule(record: Order | Booking, step: () => Promise<unknown>): void {
    clearTimeout(record.timer);
    if (this.autoAdvanceMs <= 0) return;
    record.timer = setTimeout(() => {
      step().catch((error: unknown) => console.error('Auto-advance failed:', error));
    }, this.autoAdvanceMs);
  }

  private async renderOrder(order: Order): Promise<void> {
    order.customerMessageId = await this.upsert(order.chatId, order.customerMessageId, customerOrderCard(order));
    order.staffMessageId = await this.upsert(
      order.chatId,
      order.staffMessageId,
      staffOrderCard(order, this.autoAdvanceMs),
    );
  }

  private async renderBooking(booking: Booking): Promise<void> {
    booking.customerMessageId = await this.upsert(
      booking.chatId,
      booking.customerMessageId,
      customerBookingCard(booking),
    );
    booking.staffMessageId = await this.upsert(
      booking.chatId,
      booking.staffMessageId,
      staffBookingCard(booking, this.autoAdvanceMs),
    );
  }

  /** Edits the card in place; sends it as a new message if there is none yet or it was deleted. */
  private async upsert(chatId: number, messageId: number | undefined, card: Card): Promise<number> {
    const options = { ...HTML, reply_markup: card.keyboard };
    if (messageId !== undefined) {
      try {
        await this.api.editMessageText(chatId, messageId, card.text, options);
        return messageId;
      } catch (error) {
        if (isNotModified(error)) return messageId;
      }
    }
    const sent = await this.api.sendMessage(chatId, card.text, options);
    return sent.message_id;
  }
}

export function staffFlow(staff: Staff): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  onButton(composer, /^st:(\d+):(\w+)$/, async (ctx, [, id = '', status = '']) => {
    if (!isOrderStatus(status)) return tr(ctx).expired;
    return resultNotice(ctx, await staff.advanceOrder(id, status, ctx.from?.id));
  });

  onButton(composer, /^bs:(\d+):(confirmed|declined)$/, async (ctx, [, id = '', decision]) => {
    return resultNotice(
      ctx,
      await staff.decideBooking(id, decision === 'declined' ? 'declined' : 'confirmed', ctx.from?.id),
    );
  });

  return composer;
}

function resultNotice(ctx: BotContext, result: TransitionResult): string | undefined {
  if (result === 'expired') return tr(ctx).expired;
  if (result === 'past') return tr(ctx).alreadyPast;
  return undefined;
}
