import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/core/rateLimit.js';
import { availableSlots, bookableDates, isBookable } from '../src/core/schedule.js';
import { TIME_SLOTS } from '../src/data/booking.js';
import { cleanText, escapeHtml, normalizePhone } from '../src/core/validate.js';
import { DATA_TTL_MS, Store } from '../src/store.js';

describe('rate limiter', () => {
  it('allows `limit` hits per window, per key', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 10)).toBe(true);
    expect(limiter.hit('a', 20)).toBe(false);
    expect(limiter.hit('b', 20)).toBe(true);
    expect(limiter.hit('a', 1001)).toBe(true);
  });

  it('prunes idle keys', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.hit('a', 0);
    limiter.prune(5000);
    expect(limiter.size).toBe(0);
  });
});

describe('input validation', () => {
  it('normalizes phone numbers and rejects junk', () => {
    expect(normalizePhone('+380 (67) 123-45-67')).toBe('+380671234567');
    expect(normalizePhone('380671234567')).toBe('+380671234567');
    expect(normalizePhone('call me maybe')).toBeUndefined();
    expect(normalizePhone('123')).toBeUndefined();
  });

  it('trims text and enforces length', () => {
    expect(cleanText('  Alex   K ', 10)).toBe('Alex K');
    expect(cleanText('   ', 10)).toBeUndefined();
    expect(cleanText('x'.repeat(11), 10)).toBeUndefined();
  });

  it('escapes HTML in user input', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
  });
});

describe('booking schedule', () => {
  const tz = 'Europe/Kyiv';
  // 2026-10-25 14:00 in Kyiv (UTC+2 after the DST switch that morning).
  const now = new Date('2026-10-25T12:00:00Z');

  it('offers only later slots today and all slots on later days', () => {
    expect(availableSlots('2026-10-25', now, tz)).toEqual(['15:00', '16:30', '18:00', '19:30']);
    expect(availableSlots('2026-10-26', now, tz)).toEqual([...TIME_SLOTS]);
    expect(availableSlots('2026-10-24', now, tz)).toEqual([]);
  });

  it('offers the next 7 days and skips today once it is fully booked out', () => {
    expect(bookableDates(now, tz)).toHaveLength(7);
    const lateEvening = new Date('2026-10-25T19:00:00Z'); // 21:00 in Kyiv
    const dates = bookableDates(lateEvening, tz);
    expect(dates[0]).toBe('2026-10-26');
    expect(dates).toHaveLength(6);
  });

  it('rejects slots outside the window', () => {
    expect(isBookable('2026-10-26', '12:00', now, tz)).toBe(true);
    expect(isBookable('2026-10-26', '12:15', now, tz)).toBe(false);
    expect(isBookable('2026-11-20', '12:00', now, tz)).toBe(false);
  });
});

describe('store', () => {
  it('wipes sessions, orders and bookings after 24 hours', () => {
    const store = new Store();
    store.session(1, 'en', 0);
    store.addOrder({ id: '1234', createdAt: 0 } as never);
    store.addBooking({ id: '5678', createdAt: DATA_TTL_MS } as never);
    store.sweep(DATA_TTL_MS);
    expect(store.size).toEqual({ sessions: 0, orders: 0, bookings: 1 });
  });

  it('evicts the least recently seen session past the cap', () => {
    const store = new Store({ sessions: 2, orders: 2, bookings: 2 });
    const first = store.session(1, 'en');
    first.cart = { espresso: 1 };
    store.session(2, 'en');
    store.session(1, 'en'); // touch 1, so 2 is now the oldest
    store.session(3, 'en');
    expect(store.size.sessions).toBe(2);
    expect(store.session(1, 'en').cart).toEqual({ espresso: 1 });
  });
});
