// In-memory state. Nothing is written to disk: a restart simply starts fresh
// (old buttons answer "expired"), and everything is deleted after DATA_TTL_MS.
import { randomInt } from 'node:crypto';
import type { Cart } from './core/cart.js';
import type { BookingStatus, OrderStatus } from './core/status.js';
import type { Lang } from './i18n/index.js';
import type { Currency } from './menu.js';

export const DATA_TTL_MS = 24 * 60 * 60 * 1000;

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

interface Tracked {
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

export class Store {
  private readonly sessions = new Map<number, Session>();
  readonly orders = new Map<string, Order>();
  readonly bookings = new Map<string, Booking>();

  constructor(private readonly maxSessions = 10_000) {}

  /** Returns the user's session, creating it if needed. Least recently seen sessions are evicted past maxSessions. */
  session(userId: number, defaultLang: Lang, now = Date.now()): Session {
    const existing = this.sessions.get(userId);
    const session = existing ?? { lang: defaultLang, cart: {}, step: 'idle', checkout: {}, booking: {}, lastSeen: now };
    session.lastSeen = now;
    // Re-inserting keeps the Map ordered from least to most recently seen.
    this.sessions.delete(userId);
    this.sessions.set(userId, session);
    if (this.sessions.size > this.maxSessions) {
      const oldest = this.sessions.keys().next().value;
      if (oldest !== undefined) this.sessions.delete(oldest);
    }
    return session;
  }

  get sessionCount(): number {
    return this.sessions.size;
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
    for (const records of [this.orders, this.bookings] as Map<string, Tracked>[]) {
      for (const [id, record] of records) {
        if (now - record.createdAt < DATA_TTL_MS) continue;
        clearTimeout(record.timer);
        records.delete(id);
      }
    }
  }

  /** Stops all pending timers (used on shutdown). */
  stopTimers(): void {
    for (const record of [...this.orders.values(), ...this.bookings.values()]) clearTimeout(record.timer);
  }
}
