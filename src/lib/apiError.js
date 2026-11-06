// Makine okunur hata kodları (uygulama lokalize eder).
const CODES = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED: 'unauthorized',
  NOT_FOUND: 'not_found',
  INSUFFICIENT_COINS: 'insufficient_coins',
  ALREADY_OWNED: 'already_owned',
  ITEM_LOCKED: 'item_locked',
  NOT_OWNED: 'not_owned',
  TASK_NOT_COMPLETE: 'task_not_complete',
  ALREADY_CLAIMED: 'already_claimed',
  INVALID_SCORE: 'invalid_score',
  SERVER_ERROR: 'server_error',
};

class ApiError extends Error {
  constructor(httpStatus, code, detail) {
    super(code);
    this.httpStatus = httpStatus;
    this.code = code;
    this.detail = detail;
  }

  static badRequest(detail) {
    return new ApiError(400, CODES.INVALID_REQUEST, detail);
  }

  static unauthorized(detail) {
    return new ApiError(401, CODES.UNAUTHORIZED, detail);
  }

  static notFound(detail) {
    return new ApiError(404, CODES.NOT_FOUND, detail);
  }

  static conflict(code, detail) {
    return new ApiError(409, code, detail);
  }

  static unprocessable(code, detail) {
    return new ApiError(422, code, detail);
  }

  static server(detail) {
    return new ApiError(500, CODES.SERVER_ERROR, detail);
  }

  static unavailable(detail) {
    return new ApiError(503, CODES.SERVER_ERROR, detail);
  }
}

module.exports = { ApiError, CODES };
