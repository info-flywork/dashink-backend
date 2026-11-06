// Oyun sonucu kaydı: doğrulama, rekor ödülü, coin, görev tamamlanma ve günlük parkur sırası.
const env = require('../config/env');
const { ApiError, CODES } = require('../lib/apiError');
const { scoreViolation, recordOutcome } = require('../lib/score');
const { dailySeed } = require('../lib/daily');
const { dayKey, periodWindow } = require('../lib/time');
const { newlyCompletable } = require('../lib/tasks');
const { TASKS } = require('../config/tasks');
const { mutateUser, changeCoins } = require('./userService');
const { loadMetrics } = require('./metricsService');
const { dailyStanding } = require('./leaderboardService');
const logger = require('../logger');

/** Geçerli pencerelerde claim edilmiş görev id'leri. */
async function claimedTaskIds(conn, userId, now) {
  const keys = ['daily', 'weekly', 'achievement'].map((p) => [p, periodWindow(p, now).key]);
  const [rows] = await conn.query('SELECT task_id, period_key FROM task_claims WHERE user_id = ? AND period_key IN (?)', [
    userId,
    keys.map(([, k]) => k),
  ]);
  const keyByPeriod = Object.fromEntries(keys);
  const byId = Object.fromEntries(TASKS.map((t) => [t.id, t]));
  return new Set(rows.filter((r) => byId[r.task_id] && keyByPeriod[byId[r.task_id].period] === r.period_key).map((r) => r.task_id));
}

/**
 * @param input { clientEventId, mode, seed, dailyDate, score, coinsCollected, durationMs }
 */
async function submitGame(userId, input) {
  const { clientEventId, mode, seed, score, coinsCollected, durationMs } = input;
  const now = new Date();
  let dailyDate = null;

  if (mode === 'daily') {
    const today = dayKey(now);
    if (input.dailyDate !== today) throw ApiError.badRequest(`daily_date must be today (${today})`);
    if (seed !== dailySeed(env.dailySeedSecret, today)) throw ApiError.badRequest('seed does not match daily seed');
    dailyDate = today;
  }

  const violation = scoreViolation({ score, coinsCollected, durationMs });
  if (violation) {
    logger.warn('game.invalid_score', { user_id: userId, violation, score, coins_collected: coinsCollected, duration_ms: durationMs });
    throw ApiError.unprocessable(CODES.INVALID_SCORE, violation);
  }

  return mutateUser(userId, { type: 'game', clientEventId }, async (conn, user) => {
    const before = await loadMetrics(conn, userId, now);

    await conn.query(
      `INSERT INTO games (user_id, client_event_id, mode, seed, daily_date, score, coins_collected, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, clientEventId, mode, seed, dailyDate, score, coinsCollected, durationMs, now],
    );

    const rec = recordOutcome(user.best_score, score);
    // best_score_at: tüm zamanlar sıralamasında eşitlik için best_score'a ilk ulaşma anı.
    const setBestAt = rec.best_improved || !user.best_score_at;
    await conn.query(
      `UPDATE users SET games_played = games_played + 1, best_score = ?, best_score_at = IF(?, ?, best_score_at) WHERE id = ?`,
      [rec.best_score, setBestAt ? 1 : 0, now, userId],
    );
    user.best_score = rec.best_score;

    if (coinsCollected > 0) await changeCoins(conn, user, coinsCollected, 'game_coins', clientEventId);
    if (rec.record_reward > 0) await changeCoins(conn, user, rec.record_reward, 'record_reward', clientEventId);

    const after = await loadMetrics(conn, userId, now);
    const completed = newlyCompletable(TASKS, before, after, await claimedTaskIds(conn, userId, now));

    let daily = null;
    if (mode === 'daily') {
      const standing = await dailyStanding(conn, dailyDate, userId);
      daily = { date: dailyDate, best: standing.best, rank: standing.rank };
    }

    return {
      score,
      previous_best: rec.previous_best,
      best_score: rec.best_score,
      new_record: rec.new_record,
      record_reward: rec.record_reward,
      coins_credited: coinsCollected + rec.record_reward,
      coins: Number(user.coins),
      daily,
      completed_tasks: completed,
    };
  });
}

module.exports = { submitGame, claimedTaskIds };
