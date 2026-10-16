import { buildApp } from './app.js';
import { env } from './config/env.js';

async function start() {
  const app = buildApp();

  // Graceful shutdown handlers
  const closeSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of closeSignals) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'Received shutdown signal, terminating server gracefully');
      try {
        await app.close();
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`Atelier API Server listening on ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
