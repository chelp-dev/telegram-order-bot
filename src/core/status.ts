/** An order only moves forward through these statuses. */
export const ORDER_FLOW = ['new', 'accepted', 'cooking', 'on_the_way', 'done'] as const;
export type OrderStatus = (typeof ORDER_FLOW)[number];

export type BookingStatus = 'pending' | 'confirmed' | 'declined';

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_FLOW as readonly string[]).includes(value);
}

/** Staff may jump ahead (e.g. straight to "done") but never go back. */
export function canAdvance(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_FLOW.indexOf(to) > ORDER_FLOW.indexOf(from);
}

export function nextStatus(status: OrderStatus): OrderStatus | undefined {
  return ORDER_FLOW[ORDER_FLOW.indexOf(status) + 1];
}

/** Statuses the staff can still move an order to. */
export function remainingStatuses(status: OrderStatus): OrderStatus[] {
  return ORDER_FLOW.slice(ORDER_FLOW.indexOf(status) + 1);
}

/** A booking is decided once: pending -> confirmed | declined. */
export function canDecide(status: BookingStatus): boolean {
  return status === 'pending';
}
