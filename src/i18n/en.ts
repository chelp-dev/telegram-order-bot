import type { Dict } from './uk.js';

export const en: Dict = {
  locale: 'en-GB',
  cafeName: 'Ranok — Morning Cafe',

  // Main menu
  welcome: (name: string) =>
    `Hi ${name}!\nThis is a demo bot for Ranok, a morning cafe: menu, delivery or pickup orders and table booking.\n\nWhere shall we start?`,
  btnMenu: '☕ Menu',
  btnCart: (count: number) => (count > 0 ? `🧺 My order (${count})` : '🧺 My order'),
  btnBook: '📅 Book a table',
  btnAbout: 'ℹ️ About this demo',
  btnLang: '🌐 Українська',
  langSwitched: 'Language switched to English',
  btnBack: '« Back',
  btnMainMenu: '« Main menu',
  useButtons: 'Please use the menu buttons.',
  expired: 'This button has expired. Tap /start',
  cancelled: 'Cancelled',

  // Menu and cart
  chooseCategory: 'Pick a category:',
  qtyHint: 'Tap + and − to change quantities.',
  maxQty: (max: number) => `At most ${max} of the same item`,
  cartEmpty: 'Your cart is empty. Have a look at the menu.',
  cartTitle: 'Your order:',
  total: (sum: string) => `Total: ${sum}`,
  btnCheckout: 'Checkout',
  btnClear: 'Clear',
  btnToMenu: 'To the menu',
  cartCleared: 'Cart cleared',

  // Checkout
  askFulfilment: 'How would you like to get your order?',
  btnDelivery: '🛵 Delivery',
  btnPickup: '🏃 Pickup',
  delivery: 'Delivery',
  pickup: 'Pickup',
  askName: 'What name should we put on the order?',
  btnUseName: (name: string) => `I'm ${name}`,
  askPhone: 'Your phone number? Tap the button below or type it.',
  btnSharePhone: '📱 Share my number',
  badPhone: "That doesn't look like a phone number. Try again, e.g. +44 7700 900123.",
  phoneSaved: (phone: string) => `Saved ${phone}.`,
  askAddress: 'Where should we deliver? Street, house, flat.',
  askComment: 'Any comment for the order? For example: "no sugar".',
  btnSkip: 'Skip',
  tooLong: (max: number) => `Please send a text of up to ${max} characters.`,
  summaryTitle: 'Please check your order:',
  labelName: 'Name',
  labelPhone: 'Phone',
  labelAddress: 'Address',
  labelComment: 'Comment',
  btnConfirm: '✅ Confirm',
  btnCancel: 'Cancel',

  // Order card
  orderTitle: (id: string) => `Order #${id}`,
  orderPlaced: 'Order placed!',
  orderLimit: 'Too many orders this hour. Please try again a bit later.',
  statusLabel: 'Status',
  status_new: '🆕 New',
  status_accepted: '👍 Accepted',
  status_cooking: '👨‍🍳 Cooking',
  status_on_the_way: '🛵 On the way',
  status_ready: '🛍 Ready for pickup',
  status_done: '✅ Done',
  customerHint: 'The status updates in this message.',
  customerDone: 'Enjoy! Thank you for choosing Ranok.',

  // Staff view
  staffBanner: '👀 This is what the cafe staff see',
  staffNewOrder: 'New order',
  staffNewBooking: 'New booking',
  staffDemoNote: (seconds: number) =>
    `In this demo the status advances by itself every ~${seconds}s. Or press the buttons below.`,
  btnAccept: 'Accept',
  btnCooking: 'Cooking',
  btnOnTheWay: 'On the way',
  btnReady: 'Ready',
  btnDone: 'Done',
  btnApprove: 'Confirm',
  btnDecline: 'Decline',
  alreadyPast: 'This status has already passed',

  // Booking
  chooseDate: 'Which day would you like to book?',
  chooseTime: (date: string) => `${date}. Pick a time:`,
  chooseGuests: (date: string, time: string) => `${date}, ${time}. How many guests?`,
  noSlots: 'No free slots in the coming days.',
  bookingSummary: 'Please check your booking:',
  labelDate: 'Date',
  labelTime: 'Time',
  labelGuests: 'Guests',
  bookingTitle: (id: string) => `Booking #${id}`,
  bookingPlaced: 'Booking request sent!',
  bookingLimit: 'Too many bookings this hour. Please try again later.',
  booking_pending: '⏳ Waiting for confirmation',
  booking_confirmed: '✅ Confirmed',
  booking_declined: '❌ Declined',
  bookingConfirmedHint: 'See you soon!',
  bookingDeclinedHint: 'Sorry, that time is taken. Please try another one.',

  // About
  about: (site: string, repo: string) =>
    `This bot was built by <a href="${site}">chelp.dev</a> as a demo of what a bot for your business can look like.\n` +
    `The code is open source: <a href="${repo}">GitHub</a>.\n` +
    'Order data lives in memory only and is deleted after 24 hours.',

  // Bot commands (shown in the Telegram "/" menu)
  cmdStart: 'Main menu',
  cmdLang: 'Switch language',
  cmdCancel: 'Cancel the current action',
};
