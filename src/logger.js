const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('./config/env');

const logsDir = path.resolve(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'dashink-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5_000_000,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10_000_000,
      maxFiles: 7,
    }),
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const rest = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${rest}`;
        }),
      ),
    }),
  ],
});

module.exports = logger;
