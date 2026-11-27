import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebhookServer, WEBHOOK_PATH } from '../src/webhook.js';
import { setup, USER } from './harness.js';

const SECRET = 'test_secret-123';

describe('webhook server', () => {
  let close: () => Promise<void> = () => Promise.resolve();

  afterEach(() => close());

  async function start() {
    const harness = setup();
    const server = createWebhookServer(harness.bot, SECRET);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    close = async () => {
      await harness.stop();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    };
    const { port } = server.address() as AddressInfo;
    return { ...harness, base: `http://127.0.0.1:${port}` };
  }

  const startUpdate = JSON.stringify({
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat: { id: USER.id, type: 'private', first_name: USER.first_name },
      from: USER,
      text: '/start',
      entities: [{ type: 'bot_command', offset: 0, length: 6 }],
    },
  });

  it('answers the health check', async () => {
    const { base } = await start();
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok\n');
  });

  it('refuses an update without the right secret and does not handle it', async () => {
    const { base, sent } = await start();
    const missing = await fetch(`${base}${WEBHOOK_PATH}`, { method: 'POST', body: startUpdate });
    const wrong = await fetch(`${base}${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: { 'x-telegram-bot-api-secret-token': 'nope' },
      body: startUpdate,
    });
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(sent()).toHaveLength(0);
  });

  it('handles an update that carries the secret', async () => {
    const { base, sent } = await start();
    const res = await fetch(`${base}${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': SECRET },
      body: startUpdate,
    });
    expect(res.status).toBe(200);
    expect(sent().length).toBeGreaterThan(0);
  });

  it('acknowledges an update whose handler fails, so Telegram does not deliver it again', async () => {
    const { base, failNext } = await start();
    failNext('sendMessage', 400, 'Bad Request: chat not found');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const res = await fetch(`${base}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': SECRET },
        body: startUpdate,
      });
      expect(res.status).toBe(200);
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('Error while handling update'), expect.anything());
    } finally {
      logged.mockRestore();
    }
  });

  it('returns 404 for anything else', async () => {
    const { base } = await start();
    expect((await fetch(`${base}/other`)).status).toBe(404);
    expect((await fetch(`${base}${WEBHOOK_PATH}`)).status).toBe(404);
  });
});
