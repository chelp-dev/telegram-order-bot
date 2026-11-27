// Webhook mode: Telegram POSTs each update to WEBHOOK_PATH with the secret in a header, and
// grammY answers 401 to any request without it. GET / is the health check for the host.
import { createServer, type Server } from 'node:http';
import { BotError, webhookCallback, type Bot, type Context } from 'grammy';

export const WEBHOOK_PATH = '/telegram';

export function createWebhookServer<C extends Context>(bot: Bot<C>, secret: string): Server {
  const handleUpdate = webhookCallback(bot, 'http', { secretToken: secret });

  return createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method === 'POST' && path === WEBHOOK_PATH) {
      // bot.catch only runs under bot.start(), so a handler error lands here. It goes to the same
      // handler and the update is acknowledged with 200: an error status would make Telegram
      // deliver it again and repeat its effects (an order sent twice). Polling drops it the same way.
      handleUpdate(req, res)
        .catch(async (error: unknown) => {
          if (error instanceof BotError) await bot.errorHandler(error as BotError<C>);
          else console.error('Webhook update failed:', error);
        })
        .catch((error: unknown) => console.error('Error handler failed:', error))
        .finally(() => {
          if (!res.headersSent) res.writeHead(200);
          if (!res.writableEnded) res.end();
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
