const { ApiError, CODES } = require('../lib/apiError');
const { failure } = require('../lib/response');
const logger = require('../logger');

function notFoundHandler(req, res) {
  return failure(res, 404, CODES.NOT_FOUND);
}

// Express 5: async handler'lardan fırlayan hatalar da buraya gelir.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    if (err.httpStatus >= 500) {
      logger.error('request.error', { method: req.method, path: req.path, code: err.code, detail: err.detail });
    } else if (err.detail) {
      logger.debug('request.rejected', { method: req.method, path: req.path, code: err.code, detail: err.detail });
    }
    return failure(res, err.httpStatus, err.code);
  }
  // body-parser: bozuk JSON, çok büyük gövde vb.
  if (err && (err.type === 'entity.parse.failed' || err.type === 'entity.too.large' || err.status === 400 || err.status === 413)) {
    return failure(res, 400, CODES.INVALID_REQUEST);
  }
  logger.error('request.error', { method: req.method, path: req.path, error: err && err.message, stack: err && err.stack });
  return failure(res, 500, CODES.SERVER_ERROR);
}

module.exports = { notFoundHandler, errorHandler };
