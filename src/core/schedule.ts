// Table booking calendar: which dates and time slots can be offered.
// Dates are "YYYY-MM-DD" and times "HH:MM", both in the cafe's own time zone.
import { BOOKING_DAYS, TIME_SLOTS } from '../data/booking.js';

export function localDate(now: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function localTime(now: Date, timeZone: string): string {
  const format = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return format.format(now);
}

/** Calendar arithmetic on "YYYY-MM-DD" strings; done in UTC so DST changes cannot skip or repeat a day. */
export function addDays(date: string, days: number): string {
  const utc = new Date(`${date}T00:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Slots still bookable on `date`: all of them on future days, only later ones today. */
export function availableSlots(date: string, now: Date, timeZone: string): string[] {
  const today = localDate(now, timeZone);
  if (date < today) return [];
  if (date > today) return [...TIME_SLOTS];
  const current = localTime(now, timeZone);
  return TIME_SLOTS.filter((slot) => slot > current);
}

/** The next BOOKING_DAYS dates (starting today) that still have at least one free slot. */
export function bookableDates(now: Date, timeZone: string): string[] {
  const today = localDate(now, timeZone);
  return Array.from({ length: BOOKING_DAYS }, (_, i) => addDays(today, i)).filter(
    (date) => availableSlots(date, now, timeZone).length > 0,
  );
}

export function isBookable(date: string, time: string, now: Date, timeZone: string): boolean {
  return bookableDates(now, timeZone).includes(date) && availableSlots(date, now, timeZone).includes(time);
}

/** Human-readable date, e.g. "пн, 27 жовт." or "Mon 27 Oct". */
export function formatDate(date: string, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return format.format(new Date(`${date}T12:00:00Z`));
}

/** Throws a RangeError for an unknown IANA time zone name. */
export function assertTimeZone(timeZone: string): void {
  new Intl.DateTimeFormat('en', { timeZone });
}
