const { ApiError } = require('../lib/apiError');
const { verifyAccessToken } = require('../services/authService');

function bearer(req) {
  const h = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** Zorunlu kimlik: geçerli access token yoksa 401 unauthorized. */
function requireAuth(req, _res, next) {
  const token = bearer(req);
  if (!token) return next(ApiError.unauthorized('missing token'));
  try {
    req.userId = verifyAccessToken(token).sub;
    return next();
  } catch (_) {
    return next(ApiError.unauthorized('invalid token'));
  }
}

/** İsteğe bağlı kimlik: token geçerliyse req.userId set edilir, değilse yok sayılır. */
function optionalAuth(req, _res, next) {
  const token = bearer(req);
  if (token) {
    try {
      req.userId = verifyAccessToken(token).sub;
    } catch (_) {
      // herkese açık uçlarda geçersiz token engel değil
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
