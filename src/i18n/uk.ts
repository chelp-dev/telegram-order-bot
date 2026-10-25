// Ukrainian strings. This file defines the shape of the dictionary:
// en.ts must provide exactly the same keys (enforced by the compiler and by a test).
export const uk = {
  locale: 'uk-UA',
  cafeName: 'Кав’ярня «Ранок»',

  // Main menu
  welcome: (name: string) =>
    `Привіт, ${name}!\nЦе демо-бот кав’ярні «Ранок»: меню, замовлення з доставкою чи самовивозом і бронювання столиків.\n\nЗ чого почнемо?`,
  btnMenu: '☕ Меню',
  btnCart: (count: number) => (count > 0 ? `🧺 Моє замовлення (${count})` : '🧺 Моє замовлення'),
  btnBook: '📅 Забронювати столик',
  btnAbout: 'ℹ️ Про це демо',
  btnLang: '🌐 English',
  langSwitched: 'Мову змінено на українську',
  btnBack: '« Назад',
  btnMainMenu: '« Головне меню',
  useButtons: 'Скористайтеся кнопками меню.',
  expired: 'Ця кнопка застаріла. Натисніть /start',
  cancelled: 'Скасовано',

  // Menu and cart
  chooseCategory: 'Оберіть категорію:',
  qtyHint: 'Натискайте + і −, щоб змінити кількість.',
  maxQty: (max: number) => `Максимум ${max} шт. однієї позиції`,
  cartEmpty: 'Кошик порожній. Зазирніть у меню.',
  cartTitle: 'Ваше замовлення:',
  total: (sum: string) => `Разом: ${sum}`,
  btnCheckout: 'Оформити замовлення',
  btnClear: 'Очистити',
  btnToMenu: 'До меню',
  cartCleared: 'Кошик очищено',

  // Checkout
  askFulfilment: 'Як вам зручніше отримати замовлення?',
  btnDelivery: '🛵 Доставка',
  btnPickup: '🏃 Самовивіз',
  delivery: 'Доставка',
  pickup: 'Самовивіз',
  askName: 'Як до вас звертатися? Напишіть ім’я.',
  btnUseName: (name: string) => `Я ${name}`,
  askPhone: 'Ваш номер телефону? Натисніть кнопку нижче або напишіть його.',
  btnSharePhone: '📱 Поділитися номером',
  badPhone: 'Схоже, це не номер телефону. Спробуйте ще раз, наприклад +380 67 123 4567.',
  phoneSaved: (phone: string) => `Номер ${phone} збережено.`,
  askAddress: 'Куди доставити? Вулиця, будинок, квартира.',
  askComment: 'Коментар до замовлення? Наприклад: «без цукру».',
  btnSkip: 'Пропустити',
  tooLong: (max: number) => `Надішліть, будь ласка, текст до ${max} символів.`,
  summaryTitle: 'Перевірте замовлення:',
  labelName: 'Ім’я',
  labelPhone: 'Телефон',
  labelAddress: 'Адреса',
  labelComment: 'Коментар',
  btnConfirm: '✅ Підтвердити',
  btnCancel: 'Скасувати',

  // Order card
  orderTitle: (id: string) => `Замовлення №${id}`,
  orderPlaced: 'Замовлення прийнято!',
  orderLimit: 'Забагато замовлень за годину. Спробуйте трохи пізніше.',
  statusLabel: 'Статус',
  status_new: '🆕 Нове',
  status_accepted: '👍 Прийнято',
  status_cooking: '👨‍🍳 Готуємо',
  status_on_the_way: '🛵 У дорозі',
  status_ready: '🛍 Готове до видачі',
  status_done: '✅ Виконано',
  customerHint: 'Статус оновлюється в цьому повідомленні.',
  customerDone: 'Смачного! Дякуємо, що обрали «Ранок».',

  // Staff view
  staffBanner: '👀 Так це бачить персонал кав’ярні',
  staffNewOrder: 'Нове замовлення',
  staffNewBooking: 'Нове бронювання',
  staffDemoNote: (seconds: number) =>
    `У демо статус змінюється автоматично кожні ~${seconds} с — або натискайте кнопки нижче.`,
  btnAccept: 'Прийняти',
  btnCooking: 'Готуємо',
  btnOnTheWay: 'У дорозі',
  btnReady: 'Готове',
  btnDone: 'Виконано',
  btnApprove: 'Підтвердити',
  btnDecline: 'Відхилити',
  alreadyPast: 'Цей статус уже пройдено',

  // Booking
  chooseDate: 'На який день бронюємо столик?',
  chooseTime: (date: string) => `${date}. Оберіть час:`,
  chooseGuests: (date: string, time: string) => `${date}, ${time}. Скільки буде гостей?`,
  noSlots: 'На найближчі дні вільних слотів немає.',
  bookingSummary: 'Перевірте бронювання:',
  labelDate: 'Дата',
  labelTime: 'Час',
  labelGuests: 'Гостей',
  bookingTitle: (id: string) => `Бронювання №${id}`,
  bookingPlaced: 'Запит на бронювання надіслано!',
  bookingLimit: 'Забагато бронювань за годину. Спробуйте пізніше.',
  booking_pending: '⏳ Очікує підтвердження',
  booking_confirmed: '✅ Підтверджено',
  booking_declined: '❌ Відхилено',
  bookingConfirmedHint: 'Чекаємо на вас!',
  bookingDeclinedHint: 'На жаль, цей час уже зайнятий. Спробуйте інший.',

  // About
  about: (site: string, repo: string) =>
    `Цей демо-бот зробив <a href="${site}">chelp.dev</a>, щоб показати, яким може бути бот для вашого бізнесу.\n` +
    `Код відкритий: <a href="${repo}">GitHub</a>.\n` +
    'Дані замовлень зберігаються лише в пам’яті та видаляються через 24 години.',

  // Bot commands (shown in the Telegram "/" menu)
  cmdStart: 'Головне меню',
  cmdLang: 'Змінити мову',
  cmdCancel: 'Скасувати поточну дію',
};

export type Dict = typeof uk;
