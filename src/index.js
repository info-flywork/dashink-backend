const env = require('./config/env');
const logger = require('./logger');
const { pool, ping } = require('./db');
const { createApp } = require('./app');

async function start() {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET tanımlı değil veya 32 karakterden kısa');
  }
  if (!env.dailySeedSecret || env.dailySeedSecret.length < 16) {
    throw new Error('DAILY_SEED_SECRET tanımlı değil veya 16 karakterden kısa');
  }
  if (!env.revenueCatWebhookAuth) logger.warn('REVENUECAT_WEBHOOK_AUTH boş: webhook istekleri 401 alacak');
  if (!env.revenueCatSecretKey) logger.warn('REVENUECAT_SECRET_KEY boş: /purchases/sync 500 dönecek');

  await ping();
  logger.info('db.connected', { host: env.db.host, database: env.db.database });

  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    logger.info('server.started', { host: env.host, port: env.port, env: env.nodeEnv });
  });

  const shutdown = (signal) => {
    logger.info('server.shutdown', { signal });
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(async (err) => {
  logger.error('server.start.failed', { error: err.message, stack: err.stack });
  await pool.end().catch(() => {});
  process.exit(1);
});
