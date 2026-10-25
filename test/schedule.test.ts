import { describe, expect, it } from 'vitest';
import { addDays, availableSlots, bookableDates, formatDate, isBookable } from '../src/core/schedule.js';
import { TIME_SLOTS } from '../src/data/booking.js';

const tz = 'Europe/Kyiv';
// 2026-10-25 14:00 in Kyiv (UTC+2 after the DST switch that morning).
const now = new Date('2026-10-25T12:00:00Z');

describe('booking schedule', () => {
  it('offers only later slots today and every slot on later days', () => {
    expect(availableSlots('2026-10-25', now, tz)).toEqual(['15:00', '16:30', '18:00', '19:30']);
    expect(availableSlots('2026-10-26', now, tz)).toEqual([...TIME_SLOTS]);
    expect(availableSlots('2026-10-24', now, tz)).toEqual([]);
  });

  it('offers the next 7 days and drops today once its last slot has passed', () => {
    expect(bookableDates(now, tz)).toHaveLength(7);
    const lateEvening = new Date('2026-10-25T19:00:00Z'); // 21:00 in Kyiv
    const dates = bookableDates(lateEvening, tz);
    expect(dates[0]).toBe('2026-10-26');
    expect(dates).toHaveLength(6);
  });

  it('never skips a day across a DST change', () => {
    // 23:30 in Kyiv on the evening before clocks go forward (29 March 2026).
    const beforeSpringForward = new Date('2026-03-28T21:30:00Z');
    expect(bookableDates(beforeSpringForward, tz)).toEqual([
      '2026-03-29',
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ]);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('rejects slots that are not on the list or outside the window', () => {
    expect(isBookable('2026-10-26', '12:00', now, tz)).toBe(true);
    expect(isBookable('2026-10-26', '12:15', now, tz)).toBe(false);
    expect(isBookable('2026-11-20', '12:00', now, tz)).toBe(false);
  });

  it('formats dates for people in either language', () => {
    expect(formatDate('2026-10-27', 'en-GB')).toBe('Tue 27 Oct');
    expect(formatDate('2026-10-27', 'uk-UA')).toMatch(/27/);
  });
});
