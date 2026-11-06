const gameService = require('../services/gameService');
const { ApiError } = require('../lib/apiError');
const { success } = require('../lib/response');
const { requireInt, requireString } = require('../lib/validate');

const MODES = new Set(['normal', 'daily']);

async function submit(req, res) {
  const body = req.body || {};
  const mode = requireString(body.mode, 'mode', { max: 16 });
  if (!MODES.has(mode)) throw ApiError.badRequest('mode must be normal or daily');
  const dailyDate =
    body.daily_date === undefined || body.daily_date === null ? null : requireString(body.daily_date, 'daily_date', { max: 10 });
  if (mode === 'daily' && !dailyDate) throw ApiError.badRequest('daily_date required for daily mode');

  const data = await gameService.submitGame(req.userId, {
    clientEventId: requireString(body.client_event_id, 'client_event_id', { max: 64 }),
    mode,
    seed: requireInt(body.seed, 'seed', { min: 0, max: 4_294_967_295 }),
    dailyDate,
    score: requireInt(body.score, 'score', { min: 0, max: 100_000_000 }),
    coinsCollected: requireInt(body.coins_collected, 'coins_collected', { min: 0, max: 100_000_000 }),
    // Aralık (1 .. 3 600 000) dışı süre 422 invalid_score (lib/score.js); burada yalnızca tamsayı kontrolü.
    durationMs: requireInt(body.duration_ms, 'duration_ms', { min: 0, max: 2_147_483_647 }),
  });
  return success(res, data);
}

module.exports = { submit };
