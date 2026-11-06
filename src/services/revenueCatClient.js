const env = require('../config/env');
const { ApiError } = require('../lib/apiError');
const logger = require('../logger');

/** GET {REVENUECAT_API_BASE}/subscribers/{appUserId} (REST v1, secret key). */
async function getSubscriber(appUserId) {
  if (!env.revenueCatSecretKey) {
    logger.error('revenuecat.secret_missing');
    throw ApiError.server('REVENUECAT_SECRET_KEY not configured');
  }
  const url = `${env.revenueCatApiBase.replace(/\/$/, '')}/subscribers/${encodeURIComponent(appUserId)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.revenueCatSecretKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error('revenuecat.request_failed', { error: err.message });
    throw ApiError.server('revenuecat unreachable');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('revenuecat.bad_status', { status: res.status, body: text.slice(0, 500) });
    throw ApiError.server(`revenuecat status ${res.status}`);
  }
  return res.json();
}

module.exports = { getSubscriber };
