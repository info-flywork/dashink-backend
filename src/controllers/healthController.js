const { ping } = require('../db');
const { success, failure } = require('../lib/response');
const logger = require('../logger');

async function health(_req, res) {
  try {
    await ping();
    return success(res, { db: 'up' });
  } catch (err) {
    logger.error('health.db_down', { error: err.message });
    return failure(res, 500, 'server_error');
  }
}

module.exports = { health };
