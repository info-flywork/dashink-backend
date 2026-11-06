const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const logger = require('./logger');
const { health } = require('./controllers/healthController');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

morgan.token('lang', (req) => req.get('accept-language') || '-');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy); // nginx arkasında gerçek IP

  // Basit güvenlik başlıkları (helmet yerine)
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(cors({ origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '64kb' }));
  // Klip yükleme: ham MP4 (JSON parser'dan önce, yalnızca bu yol)
  app.use(
    '/clips',
    express.raw({ type: ['video/mp4', 'application/octet-stream'], limit: '12mb' }),
  );
  app.use(
    morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms lang=:lang', {
      stream: { write: (line) => logger.info(line.trim(), { type: 'http' }) },
    }),
  );

  app.get('/health', health);
  app.use('/auth', require('./routes/authRoutes'));
  app.use('/player', require('./routes/playerRoutes'));
  app.use('/games', require('./routes/gameRoutes'));
  app.use('/events', require('./routes/eventRoutes'));
  app.use('/shop', require('./routes/shopRoutes'));
  app.use('/purchases', require('./routes/purchaseRoutes'));
  app.use('/webhooks', require('./routes/webhookRoutes'));
  app.use('/tasks', require('./routes/taskRoutes'));
  app.use('/leaderboard', require('./routes/leaderboardRoutes'));
  app.use('/daily', require('./routes/dailyRoutes'));
  app.use('/clips', require('./routes/clipRoutes'));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
