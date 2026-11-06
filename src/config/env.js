// Tüm ayarlar .env'den. Yol __dirname'e göre çözülür (PM2 farklı cwd ile başlatabilir).
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int('PORT', 4130),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  trustProxy: process.env.TRUST_PROXY || 'loopback',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: int('DB_PORT', 3306),
    user: process.env.DB_USER || 'dashink',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashink',
    connectionLimit: int('DB_POOL_LIMIT', 5),
  },

  jwtSecret: process.env.JWT_SECRET || '',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '1h',
  refreshTokenTtlDays: int('REFRESH_TOKEN_TTL_DAYS', 90),

  dailySeedSecret: process.env.DAILY_SEED_SECRET || '',

  revenueCatSecretKey: process.env.REVENUECAT_SECRET_KEY || '',
  revenueCatWebhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH || '',
  revenueCatApiBase: process.env.REVENUECAT_API_BASE || 'https://api.revenuecat.com/v1',

  bunny: {
    storageZone: process.env.BUNNY_STORAGE_ZONE || '',
    storagePassword: process.env.BUNNY_STORAGE_PASSWORD || '',
    storageHost: process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com',
    pullHost: process.env.BUNNY_PULL_ZONE_HOST || '',
  },
};

module.exports = env;
