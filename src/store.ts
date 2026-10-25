// In-memory state. Nothing is written to disk: a restart simply starts fresh
// (old buttons answer "expired"), and everything is deleted after DATA_TTL_MS.
import { randomInt } from 'node:crypto';
import type { Cart } from './core/cart.js';
import type { BookingStatus, OrderStatus } from './core/status.js';
import type { Currency } from './data/menu.js';
import type { Lang } from './i18n/index.js';

export const DATA_TTL_MS = 24 * 60 * 60 * 1000;

/** Memory bounds for a public demo; the oldest entries are dropped first. */
export const STORE_LIMITS = { sessions: 10_000, orders: 10_000, bookings: 10_000 } as const;

export type Fulfilment = 'delivery' | 'pickup';

/** Where the user is in the checkout conversation. Booking is buttons-only and needs no step. */
export type Step = 'idle' | 'name' | 'phone' | 'address' | 'comment' | 'confirm';

export interface CheckoutDraft {
  fulfilment?: Fulfilment;
  name?: string;
  phone?: string;
  address?: string;
  comment?: string;
}

export interface BookingDraft {
  date?: string;
  time?: string;
  guests?: number;
}

export interface Session {
  lang: Lang;
  cart: Cart;
  step: Step;
  checkout: CheckoutDraft;
  booking: BookingDraft;
  lastSeen: number;
}

export interface OrderLine {
  name: string;
  qty: number;
  sum: number;
}

/** Fields shared by orders and bookings: who it belongs to and where its two cards live. */
export interface Tracked {
  id: string;
  userId: number;
  chatId: number;
  lang: Lang;
  createdAt: number;
  customerMessageId?: number;
  staffMessageId?: number;
  timer?: NodeJS.Timeout;
}

export interface Order extends Tracked {
  currency: Currency;
  lines: OrderLine[];
  total: number;
  fulfilment: Fulfilment;
  name: string;
  phone: string;
  address?: string;
  comment?: string;
  status: OrderStatus;
}

export interface Booking extends Tracked {
  date: string;
  time: string;
  guests: number;
  name: string;
  status: BookingStatus;
}

/** Map.set, then drops the oldest entries (Maps iterate in insertion order) while over `max`. */
function setCapped<K, V>(map: Map<K, V>, key: K, value: V, max: number, onDrop?: (value: V) => void): void {
  map.delete(key);
  map.set(key, value);
  for (const [oldestKey, oldest] of map) {
    if (map.size <= max) break;
    onDrop?.(oldest);
    map.delete(oldestKey);
  }
}

function stopTimer(record: Tracked): void {
  clearTimeout(record.timer);
  record.timer = undefined;
}

export class Store {
  private readonly sessions = new Map<number, Session>();
  private readonly orders = new Map<string, Order>();
  private readonly bookings = new Map<string, Booking>();

  constructor(private readonly limits: { sessions: number; orders: number; bookings: number } = STORE_LIMITS) {}

  /** Returns the user's session, creating it if needed, and marks it as most recently seen. */
  session(userId: number, defaultLang: Lang, now = Date.now()): Session {
    const session = this.sessions.get(userId) ?? {
      lang: defaultLang,
      cart: {},
      step: 'idle',
      checkout: {},
      booking: {},
      lastSeen: now,
    };
    session.lastSeen = now;
    // Re-inserting keeps the Map ordered from least to most recently seen.
    setCapped(this.sessions, userId, session, this.limits.sessions);
    return session;
  }

  addOrder(order: Order): void {
    setCapped(this.orders, order.id, order, this.limits.orders, stopTimer);
  }

  addBooking(booking: Booking): void {
    setCapped(this.bookings, booking.id, booking, this.limits.bookings, stopTimer);
  }

  getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  getBooking(id: string): Booking | undefined {
    return this.bookings.get(id);
  }

  get size(): { sessions: number; orders: number; bookings: number } {
    return { sessions: this.sessions.size, orders: this.orders.size, bookings: this.bookings.size };
  }

  /** A short, human-friendly id ("4821") that is unique among live orders and bookings. */
  newId(): string {
    for (let digits = 4; ; digits++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const id = String(randomInt(10 ** (digits - 1), 10 ** digits));
        if (!this.orders.has(id) && !this.bookings.has(id)) return id;
      }
    }
  }

  /** Deletes sessions, orders and bookings older than DATA_TTL_MS, and stops their timers. */
  sweep(now = Date.now()): void {
    for (const [userId, session] of this.sessions) {
      if (now - session.lastSeen >= DATA_TTL_MS) this.sessions.delete(userId);
    }
    for (const records of [this.orders, this.bookings]) {
      for (const [id, record] of records) {
        if (now - record.createdAt < DATA_TTL_MS) continue;
        stopTimer(record);
        records.delete(id);
      }
    }
  }

  /** Stops all pending timers (used on shutdown). */
  stopTimers(): void {
    for (const record of [...this.orders.values(), ...this.bookings.values()]) stopTimer(record);
  }
}
