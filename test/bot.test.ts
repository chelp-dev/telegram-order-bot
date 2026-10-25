// End-to-end walks through the bot, with the Telegram API replaced by a recorder.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setup } from './harness.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('ordering', () => {
  it('orders coffee for pickup and plays the whole status loop', async () => {
    vi.useFakeTimers();
    const bot = setup();

    await bot.text('/start');
    expect(bot.lastText()).toContain('Привіт, Olena');

    await bot.press('cat:coffee');
    await bot.press('q:cappuccino:+:coffee');
    await bot.press('q:cappuccino:+:coffee');
    await bot.press('nav:cart');
    expect(bot.lastText()).toContain('2 × Капучино — 140 ₴');

    await bot.press('co:start');
    await bot.press('co:pickup');
    await bot.text('Олена');
    await bot.contact('+380 67 123 45 67');
    await bot.press('co:skip', 777);
    expect(bot.lastText()).toContain('+380671234567');

    await bot.press('co:ok', 777);
    expect(bot.toasts()).toContain('Замовлення прийнято!');
    expect(bot.sent().some((c) => String(c.payload.text).includes('персонал'))).toBe(true);
    expect(String(bot.editsOf(777).at(-1)?.payload.text)).toContain('Нове');

    await vi.advanceTimersByTimeAsync(40_000);
    expect(String(bot.editsOf(777).at(-1)?.payload.text)).toContain('Виконано');

    await bot.press('lang');
    expect(bot.lastText()).toContain('Hi Olena');
    await bot.stop();
  });

  it('asks for an address on delivery and escapes it in the summary', async () => {
    const bot = setup();
    await bot.press('q:espresso:+:coffee');
    await bot.press('co:start');
    await bot.press('co:delivery');
    await bot.press('co:tgname');
    await bot.text('+380 67 123 45 67');
    expect(bot.lastText()).toContain('Куди доставити?');
    await bot.text('Хрещатик 1, <b>кв. 2</b>');
    await bot.text('без цукру');
    expect(bot.lastText()).toContain('Хрещатик 1, &lt;b&gt;кв. 2&lt;/b&gt;');
    expect(bot.lastText()).toContain('Коментар: без цукру');
    await bot.stop();
  });

  it('rejects over-long names and things that are not phone numbers', async () => {
    const bot = setup();
    await bot.press('q:espresso:+:coffee');
    await bot.press('co:start');
    await bot.press('co:delivery');
    await bot.text('x'.repeat(100));
    expect(bot.lastText()).toContain('до 60 символів');
    await bot.text('Олена');
    await bot.text('not a phone');
    expect(bot.lastText()).toContain('не номер телефону');
    await bot.stop();
  });

  it('does not start checkout with an empty cart', async () => {
    const bot = setup();
    await bot.press('co:start');
    expect(bot.toasts()).toContain('Кошик порожній. Зазирніть у меню.');
    await bot.stop();
  });

  it('limits orders per hour', async () => {
    vi.useFakeTimers();
    const bot = setup({ autoAdvanceMs: 0 });
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(60_000); // stay under the per-minute flood limit
      await bot.press('q:espresso:+:coffee');
      await bot.press('co:start');
      await bot.press('co:pickup');
      await bot.press('co:tgname');
      await bot.text('+380671234567');
      await bot.press('co:skip');
      await bot.press('co:ok');
    }
    expect(bot.toasts().filter((t) => t === 'Замовлення прийнято!')).toHaveLength(5);
    expect(bot.toasts().at(-1)).toContain('Забагато замовлень');
    await bot.stop();
  });
});

describe('leaving checkout', () => {
  it('stops waiting for a name once the user navigates elsewhere', async () => {
    const bot = setup();
    await bot.press('q:espresso:+:coffee');
    await bot.press('co:start');
    await bot.press('co:pickup');
    await bot.press('nav:main');
    await bot.text('hello');
    expect(bot.lastText()).toContain('Скористайтеся кнопками меню');
    await bot.stop();
  });

  it('hides the share-contact keyboard when /start interrupts the phone step', async () => {
    const bot = setup();
    await bot.press('q:espresso:+:coffee');
    await bot.press('co:start');
    await bot.press('co:pickup');
    await bot.press('co:tgname');
    await bot.text('/start');
    expect(bot.calls.some((c) => JSON.stringify(c.payload.reply_markup) === '{"remove_keyboard":true}')).toBe(true);
    expect(bot.lastText()).toContain('Привіт, Olena');
    await bot.stop();
  });

  it('keeps the checkout when the language is switched', async () => {
    const bot = setup();
    await bot.press('q:espresso:+:coffee');
    await bot.press('co:start');
    await bot.press('co:pickup');
    await bot.text('/lang');
    await bot.text('Olena');
    expect(bot.lastText()).toContain('phone number');
    await bot.stop();
  });
});

describe('booking', () => {
  it('books a table and lets the staff decline it', async () => {
    const bot = setup();
    await bot.text('/lang');
    await bot.press('bk:d:2099-01-01'); // outside the booking window: back to the date list
    expect(bot.lastText()).toContain('Which day');

    await bot.press(`bk:d:${bot.firstMatch(/bk:d:(\d{4}-\d{2}-\d{2})/)}`);
    await bot.press(`bk:t:${bot.firstMatch(/bk:t:(\d{4})/)}`);
    await bot.press('bk:g:4');
    expect(bot.lastText()).toContain('Guests: 4');
    await bot.press('bk:ok', 900);

    const staffCard = bot.sent().find((c) => String(c.payload.text).includes('cafe staff see'));
    const id = /Booking #(\d+)/.exec(String(staffCard?.payload.text))?.[1];
    await bot.press(`bs:${id}:declined`, 1000);
    expect(String(bot.editsOf(900).at(-1)?.payload.text)).toContain('Declined');
    await bot.stop();
  });

  it('ignores a guest count that was never offered', async () => {
    const bot = setup();
    await bot.press('nav:book');
    await bot.press(`bk:d:${bot.firstMatch(/bk:d:(\d{4}-\d{2}-\d{2})/)}`);
    await bot.press(`bk:t:${bot.firstMatch(/bk:t:(\d{4})/)}`);
    await bot.press('bk:g:40');
    expect(bot.lastText()).toContain('На який день');
    await bot.stop();
  });
});

describe('buttons', () => {
  it('answers every callback query, including stale and unknown ones', async () => {
    const bot = setup();
    await bot.press('st:9999:done');
    await bot.press('something:old');
    expect(bot.answers()).toHaveLength(2);
    expect(bot.toasts()).toEqual(['Ця кнопка застаріла. Натисніть /start', 'Ця кнопка застаріла. Натисніть /start']);
    await bot.stop();
  });

  it('still answers the button when the handler fails, without sending a duplicate screen', async () => {
    const bot = setup();
    bot.failNext('editMessageText', 429, 'Too Many Requests: retry after 5');
    // In production the error reaches bot.catch; handleUpdate rethrows it to the caller.
    await expect(bot.press('nav:menu')).rejects.toThrow('429');
    expect(bot.answers()).toHaveLength(1);
    expect(bot.calls.filter((c) => c.method === 'sendMessage')).toHaveLength(0);
    await bot.stop();
  });

  it('sends a new screen when the old message can no longer be edited', async () => {
    const bot = setup();
    bot.failNext('editMessageText', 400, "Bad Request: message can't be edited");
    await bot.press('nav:menu');
    expect(bot.calls.at(-2)?.method).toBe('sendMessage');
    await bot.stop();
  });

  it('treats "message is not modified" as success', async () => {
    const bot = setup();
    bot.failNext('editMessageText', 400, 'Bad Request: message is not modified');
    await bot.press('nav:menu');
    expect(bot.calls.filter((c) => c.method === 'sendMessage')).toHaveLength(0);
    await bot.stop();
  });

  it('ignores group chats', async () => {
    const bot = setup();
    await bot.bot.handleUpdate({
      update_id: 999,
      message: { message_id: 1, date: 0, chat: { id: -5, type: 'group', title: 'g' }, from: bot.USER, text: 'hi' },
    });
    expect(bot.calls).toHaveLength(0);
    await bot.stop();
  });
});
