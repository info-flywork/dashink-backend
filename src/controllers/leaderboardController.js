const leaderboardService = require('../services/leaderboardService');
const { LEADERBOARD_PERIODS, parseLimit } = require('../lib/leaderboard');
const { ApiError } = require('../lib/apiError');
const { success } = require('../lib/response');

async function get(req, res) {
  const period = req.query.period === undefined || req.query.period === '' ? 'daily' : req.query.period;
  if (!LEADERBOARD_PERIODS.includes(period)) throw ApiError.badRequest('period must be daily, weekly or all');
  const limit = parseLimit(req.query.limit);
  if (limit === null) throw ApiError.badRequest('limit must be an integer in 1..100');
  return success(res, await leaderboardService.getLeaderboard(req.userId, { period, limit }));
}

module.exports = { get };
