// End-to-end walk through the bot with the Telegram API replaced by a recorder.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBot } from '../src/bot.js';

const USER = { id: 42, is_bot: false, first_name: 'Olena', language_code: 'uk' };
const CHAT = { id: 42, type: 'private' as const, first_name: 'Olena' };
const BOT_INFO = {
  id: 1,
  is_bot: true as const,
  first_name: 'Demo',
  username: 'demo_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
};

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

function setup() {
  const { bot, stop } = createBot(
    'test-token',
    {
      autoAdvanceMs: 10_000,
      timeZone: 'Europe/Kyiv',
      siteUrl: 'https://chelp.dev',
      repoUrl: 'https://example.com/repo',
    },
    BOT_INFO as never,
  );
  const calls: Call[] = [];
  let messageId = 1000;
  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload });
    const result = method === 'sendMessage' ? { message_id: messageId++, date: 0, chat: CHAT } : true;
    return Promise.resolve({ ok: true, result } as never);
  });

  let updateId = 1;
  const text = (value: string) => {
    const entities = value.startsWith('/')
      ? [{ type: 'bot_command' as const, offset: 0, length: value.length }]
      : undefined;
    return bot.handleUpdate({
      update_id: updateId++,
      message: { message_id: updateId, date: 0, chat: CHAT, from: USER, text: value, entities },
    });
  };
  const press = (data: string, onMessage = 500) =>
    bot.handleUpdate({
      update_id: updateId++,
      callback_query: {
        id: String(updateId),
        from: USER,
        chat_instance: 'x',
        data,
        message: { message_id: onMessage, date: 0, chat: CHAT, from: BOT_INFO, text: '...' },
      },
    });
  const contact = (phone: string) =>
    bot.handleUpdate({
      update_id: updateId++,
      message: {
        message_id: updateId,
        date: 0,
        chat: CHAT,
        from: USER,
        contact: { phone_number: phone, first_name: 'Olena', user_id: 42 },
      },
    });
  const lastText = () =>
    String(calls.filter((c) => c.method === 'sendMessage' || c.method === 'editMessageText').at(-1)?.payload.text);
  const toasts = () =>
    calls
      .filter((c) => c.method === 'answerCallbackQuery')
      .map((c) => c.payload.text)
      .filter(Boolean);
  /** First capture of `pattern` anywhere in what the bot sent (e.g. a callback_data value). */
  const firstMatch = (pattern: RegExp) => pattern.exec(JSON.stringify(calls))?.[1] ?? '';
  return { calls, text, press, contact, lastText, toasts, firstMatch, stop };
}

describe('bot flow', () => {
  afterEach(() => vi.useRealTimers());

  it('orders coffee for pickup and walks the status loop', async () => {
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
    const staffCard = bot.calls.find((c) => c.method === 'sendMessage' && String(c.payload.text).includes('персонал'));
    expect(staffCard).toBeDefined();
    expect(
      bot.calls.some(
        (c) =>
          c.method === 'editMessageText' && c.payload.message_id === 777 && String(c.payload.text).includes('Нове'),
      ),
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(40_000);
    const customerEdits = bot.calls.filter((c) => c.method === 'editMessageText' && c.payload.message_id === 777);
    expect(String(customerEdits.at(-1)?.payload.text)).toContain('Виконано');

    await bot.press('lang');
    expect(bot.lastText()).toContain('Hi Olena');
    await bot.stop();
  });

  it('books a table and lets the staff decline it', async () => {
    const bot = setup();
    await bot.text('/lang'); // switch to English
    await bot.press('bk:d:2099-01-01'); // outside the 7-day window: back to the date list
    expect(bot.lastText()).toContain('Which day');

    const date = bot.firstMatch(/bk:d:(\d{4}-\d{2}-\d{2})/);
    await bot.press(`bk:d:${date}`);
    await bot.press(`bk:t:${bot.firstMatch(/bk:t:(\d{4})/)}`);
    await bot.press('bk:g:4');
    expect(bot.lastText()).toContain('Guests: 4');
    await bot.press('bk:ok', 900);

    const staffCard = bot.calls.find(
      (c) => c.method === 'sendMessage' && String(c.payload.text).includes('cafe staff see'),
    );
    const id = /Booking #(\d+)/.exec(String(staffCard?.payload.text))?.[1];
    await bot.press(`bs:${id}:declined`, 1000);
    expect(
      bot.calls.some(
        (c) =>
          c.method === 'editMessageText' && c.payload.message_id === 900 && String(c.payload.text).includes('Declined'),
      ),
    ).toBe(true);
    await bot.stop();
  });

  it('rejects junk input politely', async () => {
    const bot = setup();
    await bot.press('cat:coffee');
    await bot.press('q:espresso:+:coffee');
    await bot.press('co:start');
    await bot.press('co:delivery');
    await bot.text('x'.repeat(100));
    expect(bot.lastText()).toContain('до 60 символів');
    await bot.text('Олена');
    await bot.text('not a phone');
    expect(bot.lastText()).toContain('не номер телефону');
    await bot.press('st:9999:done');
    expect(bot.toasts()).toContain('Ця кнопка застаріла. Натисніть /start');
    await bot.stop();
  });
});
