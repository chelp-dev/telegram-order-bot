// Table booking options. Times are "HH:MM" in the cafe's time zone (CAFE_TIMEZONE).

/** Start times a table can be booked for, in ascending order. */
export const TIME_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'] as const;

/** Party sizes offered as buttons. */
export const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/** How many days ahead (including today) a table can be booked. */
export const BOOKING_DAYS = 7;
