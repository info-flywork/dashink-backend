const authService = require('../services/authService');
const { success } = require('../lib/response');
const { requireString, optionalString } = require('../lib/validate');

async function device(req, res) {
  const body = req.body || {};
  const data = await authService.loginWithDevice({
    deviceId: requireString(body.device_id, 'device_id', { max: 128 }),
    platform: optionalString(body.platform, 'platform', { max: 16 }),
    appVersion: optionalString(body.app_version, 'app_version', { max: 32 }),
  });
  return success(res, data);
}

async function refresh(req, res) {
  const body = req.body || {};
  const token = requireString(body.refresh_token, 'refresh_token', { max: 256 });
  return success(res, await authService.refresh(token));
}

module.exports = { device, refresh };
