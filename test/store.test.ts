import { describe, expect, it } from 'vitest';
import { DATA_TTL_MS, Store, type Order } from '../src/store.js';

const record = (id: string, createdAt: number) => ({ id, createdAt }) as Order;

describe('Store', () => {
  it('wipes sessions, orders and bookings after 24 hours', () => {
    const store = new Store();
    store.session(1, 'en', 0);
    store.addOrder(record('1234', 0));
    store.addBooking({ ...record('5678', DATA_TTL_MS), status: 'pending' } as never);
    store.sweep(DATA_TTL_MS);
    expect(store.size).toEqual({ sessions: 0, orders: 0, bookings: 1 });
  });

  it('stops the demo timer of an expired order', () => {
    const store = new Store();
    let fired = false;
    const order = record('1234', 0);
    order.timer = setTimeout(() => (fired = true), 0);
    store.addOrder(order);
    store.sweep(DATA_TTL_MS);
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(fired).toBe(false);
        resolve();
      }, 5),
    );
  });

  it('evicts the least recently seen session past the cap', () => {
    const store = new Store({ sessions: 2, orders: 2, bookings: 2 });
    store.session(1, 'en').cart = { espresso: 1 };
    store.session(2, 'en');
    store.session(1, 'en'); // touch 1, so 2 is now the oldest
    store.session(3, 'en');
    expect(store.size.sessions).toBe(2);
    expect(store.session(1, 'en').cart).toEqual({ espresso: 1 });
  });

  it('caps orders, dropping the oldest', () => {
    const store = new Store({ sessions: 2, orders: 2, bookings: 2 });
    for (const id of ['1', '2', '3']) store.addOrder(record(id, 0));
    expect(store.getOrder('1')).toBeUndefined();
    expect(store.getOrder('3')).toBeDefined();
  });

  it('hands out ids unique among live orders and bookings', () => {
    const store = new Store();
    const ids = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const id = store.newId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
      store.addOrder(record(id, 0));
    }
  });
});
