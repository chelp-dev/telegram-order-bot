// A bot wired to a recording fake of the Telegram API, plus helpers to send it updates.
import { GrammyError } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import { createBot } from '../src/bot.js';
import type { BotConfig } from '../src/config.js';

export const USER = { id: 42, is_bot: false, first_name: 'Olena', language_code: 'uk' };
const CHAT = { id: 42, type: 'private' as const, first_name: 'Olena' };
const BOT_INFO: UserFromGetMe = {
  id: 1,
  is_bot: true,
  first_name: 'Demo',
  username: 'demo_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
};

export interface Call {
  method: string;
  payload: Record<string, unknown>;
}

/** Makes the fake API fail the next call to `method` with this Telegram error. */
interface Failure {
  method: string;
  code: number;
  description: string;
}

export function apiError(method: string, code: number, description: string): GrammyError {
  return new GrammyError(`Call to '${method}' failed!`, { ok: false, error_code: code, description }, method, {});
}

export function setup(config: Partial<BotConfig> = {}) {
  const { bot, store, stop } = createBot(
    'test-token',
    {
      autoAdvanceMs: 10_000,
      timeZone: 'Europe/Kyiv',
      siteUrl: 'https://chelp.dev',
      repoUrl: 'https://example.com/repo',
      ...config,
    },
    BOT_INFO,
  );
  const calls: Call[] = [];
  const failures: Failure[] = [];
  let messageId = 1000;
  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload });
    const failure = failures.findIndex((f) => f.method === method);
    if (failure !== -1) {
      const [{ code, description }] = failures.splice(failure, 1) as [Failure];
      return Promise.resolve({ ok: false, error_code: code, description } as never);
    }
    const result = method === 'sendMessage' ? { message_id: messageId++, date: 0, chat: CHAT } : true;
    return Promise.resolve({ ok: true, result } as never);
  });

  let updateId = 1;
  const send = (update: Omit<Update, 'update_id'>) => bot.handleUpdate({ update_id: updateId++, ...update });

  const text = (value: string) => {
    const entities = value.startsWith('/')
      ? [{ type: 'bot_command' as const, offset: 0, length: value.split(' ')[0]!.length }]
      : undefined;
    return send({ message: { message_id: updateId, date: 0, chat: CHAT, from: USER, text: value, entities } });
  };
  const press = (data: string, onMessage = 500) =>
    send({
      callback_query: {
        id: String(updateId),
        from: USER,
        chat_instance: 'x',
        data,
        message: { message_id: onMessage, date: 0, chat: CHAT, from: BOT_INFO, text: '...' },
      },
    });
  const contact = (phone: string) =>
    send({
      message: {
        message_id: updateId,
        date: 0,
        chat: CHAT,
        from: USER,
        contact: { phone_number: phone, first_name: 'Olena', user_id: USER.id },
      },
    });

  const sent = () => calls.filter((c) => c.method === 'sendMessage' || c.method === 'editMessageText');
  const lastText = () => String(sent().at(-1)?.payload.text);
  const answers = () => calls.filter((c) => c.method === 'answerCallbackQuery');
  const toasts = () =>
    answers()
      .map((c) => c.payload.text)
      .filter(Boolean);
  const editsOf = (messageId: number) =>
    calls.filter((c) => c.method === 'editMessageText' && c.payload.message_id === messageId);
  /** First capture of `pattern` anywhere in what the bot sent (e.g. a callback_data value). */
  const firstMatch = (pattern: RegExp) => pattern.exec(JSON.stringify(calls))?.[1] ?? '';
  const failNext = (method: string, code: number, description: string) => failures.push({ method, code, description });

  return {
    bot,
    store,
    USER,
    calls,
    text,
    press,
    contact,
    sent,
    lastText,
    answers,
    toasts,
    editsOf,
    firstMatch,
    failNext,
    stop,
  };
}
