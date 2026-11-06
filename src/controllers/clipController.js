const crypto = require('crypto');
const bunny = require('../infra/bunny');
const { ApiError } = require('../lib/apiError');
const { success } = require('../lib/response');

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

async function upload(req, res, next) {
  try {
    if (!bunny.enabled()) {
      throw ApiError.unavailable('bunny_not_configured');
    }
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      throw ApiError.badRequest('empty_body');
    }
    if (buf.length > MAX_BYTES) {
      throw ApiError.badRequest('file_too_large');
    }
    // Basit MP4/ftyp imzası (ilk kutuda "ftyp")
    const head = buf.subarray(0, 12).toString('latin1');
    if (!head.includes('ftyp')) {
      throw ApiError.badRequest('invalid_video');
    }

    const id = crypto.randomUUID().replace(/-/g, '');
    const objectPath = `clips/${req.userId}/${id}.mp4`;
    const url = await bunny.put(objectPath, buf, 'video/mp4');
    return success(res, { url, path: objectPath }, 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = { upload };
