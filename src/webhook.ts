// Webhook mode: Telegram POSTs each update to WEBHOOK_PATH with the secret in a header, and
// grammY answers 401 to any request without it. GET / is the health check for the host.
import { createServer, type Server } from 'node:http';
import { webhookCallback, type Bot, type Context } from 'grammy';

export const WEBHOOK_PATH = '/telegram';

export function createWebhookServer<C extends Context>(bot: Bot<C>, secret: string): Server {
  const handleUpdate = webhookCallback(bot, 'http', { secretToken: secret });

  return createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method === 'POST' && path === WEBHOOK_PATH) {
      handleUpdate(req, res).catch((error: unknown) => {
        console.error('Webhook update failed:', error);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      return;
    }
    if (req.method === 'GET' && path === '/') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end('ok\n');
      return;
    }
    res.writeHead(404).end();
  });
}
