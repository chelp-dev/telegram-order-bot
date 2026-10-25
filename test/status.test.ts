import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canAdvance, canDecide, nextStatus, remainingStatuses } from '../src/core/status.js';
import { Staff } from '../src/flows/staff.js';
import { Store, type Booking, type Order } from '../src/store.js';

describe('order status rules', () => {
  it('moves forward only, and may skip ahead', () => {
    expect(canAdvance('new', 'accepted')).toBe(true);
    expect(canAdvance('new', 'done')).toBe(true);
    expect(canAdvance('cooking', 'accepted')).toBe(false);
    expect(canAdvance('done', 'done')).toBe(false);
  });

  it('knows the next and remaining statuses', () => {
    expect(nextStatus('new')).toBe('accepted');
    expect(nextStatus('done')).toBeUndefined();
    expect(remainingStatuses('cooking')).toEqual(['on_the_way', 'done']);
  });

  it('decides a booking only once', () => {
    expect(canDecide('pending')).toBe(true);
    expect(canDecide('confirmed')).toBe(false);
    expect(canDecide('declined')).toBe(false);
  });
});

function fakeApi() {
  let nextId = 100;
  return {
    sendMessage: vi.fn(() => Promise.resolve({ message_id: nextId++ })),
    editMessageText: vi.fn(() => Promise.resolve(true)),
  };
}

function makeOrder(store: Store): Order {
  return {
    id: store.newId(),
    userId: 1,
    chatId: 1,
    lang: 'en',
    currency: 'EUR',
    lines: [{ name: 'Cappuccino', qty: 2, sum: 640 }],
    total: 640,
    fulfilment: 'pickup',
    name: 'Test',
    phone: '+380000000000',
    status: 'new',
    createdAt: Date.now(),
    customerMessageId: 10,
  };
}

describe('Staff', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('edits the customer card in place and sends one staff card', async () => {
    const api = fakeApi();
    const store = new Store();
    const staff = new Staff(api as never, store, 0);
    const order = makeOrder(store);
    await staff.startOrder(order);
    expect(api.editMessageText).toHaveBeenCalledTimes(1);
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(order.customerMessageId).toBe(10);
    expect(order.staffMessageId).toBe(100);
  });

  it('staff buttons advance the order and refuse to go back', async () => {
    const store = new Store();
    const staff = new Staff(fakeApi() as never, store, 0);
    const order = makeOrder(store);
    await staff.startOrder(order);
    expect(await staff.advanceOrder(order.id, 'cooking', 1)).toBe('ok');
    expect(order.status).toBe('cooking');
    expect(await staff.advanceOrder(order.id, 'accepted', 1)).toBe('past');
    expect(await staff.advanceOrder(order.id, 'done', 2)).toBe('expired'); // someone else's order
    expect(await staff.advanceOrder('nope', 'done', 1)).toBe('expired');
  });

  it('auto-advances through the whole loop when nobody presses anything', async () => {
    const store = new Store();
    const staff = new Staff(fakeApi() as never, store, 10_000);
    const order = makeOrder(store);
    await staff.startOrder(order);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(10_000);
      seen.push(order.status);
    }
    expect(seen).toEqual(['accepted', 'cooking', 'on_the_way', 'done', 'done']);
  });

  it('auto-confirms a pending booking, but a staff decision wins', async () => {
    const store = new Store();
    const staff = new Staff(fakeApi() as never, store, 10_000);
    const base: Omit<Booking, 'id'> = {
      userId: 1,
      chatId: 1,
      lang: 'uk',
      date: '2026-10-27',
      time: '12:00',
      guests: 2,
      name: 'Test',
      status: 'pending',
      createdAt: Date.now(),
    };
    const auto: Booking = { ...base, id: store.newId() };
    const manual: Booking = { ...base, id: store.newId() };
    await staff.startBooking(auto);
    await staff.startBooking(manual);
    expect(await staff.decideBooking(manual.id, 'declined', 1)).toBe('ok');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(auto.status).toBe('confirmed');
    expect(manual.status).toBe('declined');
  });
});
