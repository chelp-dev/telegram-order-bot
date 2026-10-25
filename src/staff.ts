// The "kitchen/owner" side of the demo: order and booking lifecycles, their demo timers,
// and keeping both cards (customer's and staff's) in sync with the current status.
// In a real deployment the staff card would go to the cafe's own chat; here the customer
// receives it too, so they can see the whole loop.
import type { Api } from 'grammy';
import { canAdvance, canDecide, nextStatus, type OrderStatus } from './core/status.js';
import { HTML, isNotModified, shouldSendInstead } from './context.js';
import { customerBookingCard, customerOrderCard, staffBookingCard, staffOrderCard, type Card } from './flows/cards.js';
import type { Booking, Order, Store, Tracked } from './store.js';

export type TransitionResult = 'ok' | 'expired' | 'past';

type MessagingApi = Pick<Api, 'sendMessage' | 'editMessageText'>;

export class Staff {
  /** The latest render of each record. Renders are chained so a slow edit can never overwrite a newer one. */
  private readonly renders = new WeakMap<Tracked, Promise<void>>();

  constructor(
    private readonly api: MessagingApi,
    private readonly store: Store,
    private readonly autoAdvanceMs: number,
  ) {}

  /** Registers a confirmed order, shows both cards and starts the demo timer. */
  async startOrder(order: Order): Promise<void> {
    this.store.addOrder(order);
    await this.renderOrder(order);
    this.scheduleOrder(order);
  }

  /** `byUserId` limits the change to the user the order belongs to (button presses); timers omit it. */
  async advanceOrder(id: string, to: OrderStatus, byUserId?: number): Promise<TransitionResult> {
    const order = this.store.getOrder(id);
    if (!order || (byUserId !== undefined && order.userId !== byUserId)) return 'expired';
    if (!canAdvance(order.status, to)) return 'past';
    order.status = to;
    this.scheduleOrder(order);
    await this.renderOrder(order);
    return 'ok';
  }

  async startBooking(booking: Booking): Promise<void> {
    this.store.addBooking(booking);
    await this.renderBooking(booking);
    this.schedule(booking, () => this.decideBooking(booking.id, 'confirmed'));
  }

  async decideBooking(id: string, decision: 'confirmed' | 'declined', byUserId?: number): Promise<TransitionResult> {
    const booking = this.store.getBooking(id);
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
    if (next) this.schedule(order, () => this.advanceOrder(order.id, next));
    else clearTimeout(order.timer);
  }

  private schedule(record: Tracked, step: () => Promise<unknown>): void {
    clearTimeout(record.timer);
    if (this.autoAdvanceMs <= 0) return;
    record.timer = setTimeout(() => {
      step().catch((error: unknown) => console.error(`Auto-advance of #${record.id} failed:`, error));
    }, this.autoAdvanceMs);
  }

  private renderOrder(order: Order): Promise<void> {
    return this.enqueueRender(order, async () => {
      order.customerMessageId = await this.upsert(order.chatId, order.customerMessageId, customerOrderCard(order));
      const staffCard = staffOrderCard(order, this.autoAdvanceMs);
      order.staffMessageId = await this.upsert(order.chatId, order.staffMessageId, staffCard);
    });
  }

  private renderBooking(booking: Booking): Promise<void> {
    return this.enqueueRender(booking, async () => {
      const customerCard = customerBookingCard(booking);
      booking.customerMessageId = await this.upsert(booking.chatId, booking.customerMessageId, customerCard);
      const staffCard = staffBookingCard(booking, this.autoAdvanceMs);
      booking.staffMessageId = await this.upsert(booking.chatId, booking.staffMessageId, staffCard);
    });
  }

  /** Runs `draw` after the record's previous render, whether that one succeeded or not. */
  private enqueueRender(record: Tracked, draw: () => Promise<void>): Promise<void> {
    const previous = this.renders.get(record) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(draw);
    this.renders.set(record, current);
    return current;
  }

  /** Edits the card in place; sends it as a new message if there is none yet or it can no longer be edited. */
  private async upsert(chatId: number, messageId: number | undefined, card: Card): Promise<number> {
    const options = { ...HTML, reply_markup: card.keyboard };
    if (messageId !== undefined) {
      try {
        await this.api.editMessageText(chatId, messageId, card.text, options);
        return messageId;
      } catch (error) {
        if (isNotModified(error)) return messageId;
        if (!shouldSendInstead(error)) throw error;
      }
    }
    const sent = await this.api.sendMessage(chatId, card.text, options);
    return sent.message_id;
  }
}
