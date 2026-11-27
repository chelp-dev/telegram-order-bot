import { createBot } from './bot.js';
import { ConfigError, loadConfig } from './config.js';
import { createWebhookServer } from './webhook.js';

async function main(): Promise<void> {
  const { token, config, webhook } = loadConfig(process.env);
  const { bot, setCommands, stop } = createBot(token, config);

  const shutdown = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      shutdown.abort();
      console.log(`${signal} received, shutting down`);
      stop().catch((error: unknown) => {
        console.error('Shutdown failed:', error);
        process.exit(1);
      });
    });
  }

  if (webhook) {
    // The host routes Telegram's POSTs here; the webhook URL itself is registered by the deploy.
    await bot.init();
    const server = createWebhookServer(bot, webhook.secret);
    shutdown.signal.addEventListener('abort', () => server.close(), { once: true });
    server.listen(webhook.port, () =>
      console.log(`@${bot.botInfo.username} is running (webhook, port ${webhook.port})`),
    );
    // Not awaited: a cold start answers its first update without waiting for the command menu.
    setCommands().catch((error: unknown) => console.error('setMyCommands failed:', error));
    return;
  }

  await setCommands();
  if (shutdown.signal.aborted) return; // a signal arrived before polling started
  // Resolves once stop() has ended polling.
  await bot.start({
    drop_pending_updates: true,
    onStart: (me) => console.log(`@${me.username} is running (long polling)`),
  });
}

process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
});
