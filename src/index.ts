import { createBot } from './bot.js';
import { ConfigError, loadConfig } from './config.js';

async function main(): Promise<void> {
  const { token, config } = loadConfig(process.env);
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
