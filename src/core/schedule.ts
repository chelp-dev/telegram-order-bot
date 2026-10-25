// Table booking calendar: which dates and time slots can be offered.
// All dates are "YYYY-MM-DD" and times "HH:MM" in the cafe's own time zone.

export const TIME_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'] as const;
export const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
export const BOOKING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function localDate(now: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function localTime(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    now,
  );
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
  const dates = new Set<string>();
  for (let i = 0; i < BOOKING_DAYS; i++) dates.add(localDate(new Date(now.getTime() + i * DAY_MS), timeZone));
  return [...dates].filter((date) => availableSlots(date, now, timeZone).length > 0);
}

export function isBookable(date: string, time: string, now: Date, timeZone: string): boolean {
  return bookableDates(now, timeZone).includes(date) && availableSlots(date, now, timeZone).includes(time);
}

/** Human-readable date, e.g. "пн, 27 жовт." or "Mon 27 Oct". */
export function formatDate(date: string, locale: string): string {
  const noonUtc = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    noonUtc,
  );
}
