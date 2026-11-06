const { ApiError } = require('./apiError');

function requireString(value, field, { max = 128, min = 1 } = {}) {
  if (typeof value !== 'string') throw ApiError.badRequest(`${field} must be a string`);
  const v = value.trim();
  if (v.length < min || v.length > max) throw ApiError.badRequest(`${field} length must be ${min}..${max}`);
  return v;
}

function optionalString(value, field, opts = {}) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, opts);
}

function requireInt(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = typeof value === 'string' && /^-?\d+$/.test(value.trim()) ? Number(value) : value;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw ApiError.badRequest(`${field} must be an integer in ${min}..${max}`);
  }
  return n;
}

module.exports = { requireString, optionalString, requireInt };
