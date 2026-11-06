// Bunny Storage API — klip yükleme. Anahtarlar yalnızca .env'de.
const env = require('../config/env');
const logger = require('../logger');

function enabled() {
  return Boolean(env.bunny.storageZone && env.bunny.storagePassword && env.bunny.pullHost);
}

/**
 * Buffer'ı storage zone'a yazar; public CDN URL döner.
 * @param {string} objectPath örn. clips/u123/abc.mp4
 * @param {Buffer} body
 * @param {string} contentType
 * @returns {Promise<string>} https://dashink.b-cdn.net/...
 */
async function put(objectPath, body, contentType = 'application/octet-stream') {
  if (!enabled()) {
    const err = new Error('bunny_not_configured');
    err.status = 503;
    throw err;
  }
  const path = objectPath.replace(/^\/+/, '');
  const url = `https://${env.bunny.storageHost}/${env.bunny.storageZone}/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: env.bunny.storagePassword,
      'Content-Type': contentType,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('bunny.put_failed', { status: res.status, path, text: text.slice(0, 200) });
    const err = new Error('bunny_upload_failed');
    err.status = 502;
    throw err;
  }
  return `https://${env.bunny.pullHost}/${path}`;
}

module.exports = { enabled, put };
