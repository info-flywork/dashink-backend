// Kullanıcı satırı kilitleme, PlayerProgress şekli (+ lazy günlük sıra ödülü), coin defteri ve istemci olayı idempotentliği.
const { withTransaction } = require('../db');
const { ApiError } = require('../lib/apiError');
const { toProgress } = require('../lib/player');
const { pastDayKeys } = require('../lib/time');
const { DAILY_REWARD_LOOKBACK_DAYS, rankReward } = require('../lib/daily');
const { dailyStanding } = require('./leaderboardService');
const logger = require('../logger');

/** Kullanıcıyı SELECT ... FOR UPDATE ile kilitler (transaction içinde çağrılmalı). */
async function lockUser(conn, userId) {
  const [[user]] = await conn.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
  if (!user) throw ApiError.unauthorized('user not found');
  return user;
}

async function userItemIds(conn, userId) {
  const [rows] = await conn.query('SELECT item_id FROM user_items WHERE user_id = ?', [userId]);
  return rows.map((r) => r.item_id);
}

/** Coin değişikliği + defter kaydı. delta negatifse bakiye kontrolü çağırandadır. Yeni bakiyeyi döner. */
async function changeCoins(conn, user, delta, reason, ref = null) {
  const balanceAfter = Number(user.coins) + delta;
  if (balanceAfter < 0) throw new Error('coin balance would go negative');
  if (delta !== 0) {
    await conn.query('UPDATE users SET coins = ? WHERE id = ?', [balanceAfter, user.id]);
  }
  await conn.query('INSERT INTO coin_ledger (user_id, delta, balance_after, reason, ref) VALUES (?, ?, ?, ?, ?)', [
    user.id,
    delta,
    balanceAfter,
    reason,
    ref,
  ]);
  user.coins = balanceAfter;
  return balanceAfter;
}

/**
 * Lazy günlük meydan okuma ödülü (kullanıcı kilitliyken çağrılır).
 * Son 7 günün (bugün hariç) günlük parkurunda oynadığı ve henüz değerlendirilmemiş her gün için sırası hesaplanır;
 * ilk reward_top içindeyse reward altın yüklenir. Her gün daily_rewards (user_id, date) UNIQUE ile bir kez
 * değerlendirilir (ödülsüz günler coins = 0 ile işaretlenir, tekrar hesaplanmaz).
 * @returns {Promise<Array<{type, date, rank, coins}>>} bu çağrıda yeni yüklenen ödüller
 */
async function creditDailyRewards(conn, user, now = new Date()) {
  const days = pastDayKeys(now, DAILY_REWARD_LOOKBACK_DAYS);
  const [played] = await conn.query(
    `SELECT DISTINCT g.daily_date AS d FROM games g
      WHERE g.user_id = ? AND g.mode = 'daily' AND g.daily_date IN (?)
        AND NOT EXISTS (SELECT 1 FROM daily_rewards r WHERE r.user_id = g.user_id AND r.date = g.daily_date)
      ORDER BY d ASC`,
    [user.id, days],
  );
  const rewards = [];
  for (const { d } of played) {
    const standing = await dailyStanding(conn, d, user.id);
    if (!standing) continue;
    const coins = rankReward(standing.rank);
    const [r] = await conn.query(
      'INSERT IGNORE INTO daily_rewards (user_id, date, `rank`, coins) VALUES (?, ?, ?, ?)',
      [user.id, d, standing.rank, coins],
    );
    if (r.affectedRows === 1 && coins > 0) {
      await changeCoins(conn, user, coins, 'daily_rank', d);
      rewards.push({ type: 'daily_rank', date: d, rank: standing.rank, coins });
      logger.info('daily.reward', { user_id: user.id, date: d, rank: standing.rank, coins });
    }
  }
  return rewards;
}

/** Kilitli kullanıcı için PlayerProgress (bekleyen günlük ödüller yüklenerek). */
async function buildProgress(conn, user) {
  const rewards = await creditDailyRewards(conn, user);
  return toProgress(user, await userItemIds(conn, user.id), rewards);
}

async function getProgress(userId) {
  return withTransaction(async (conn) => buildProgress(conn, await lockUser(conn, userId)));
}

/**
 * Kullanıcıyı kilitleyip fn(conn, user) çalıştırır. clientEventId verilmişse idempotent:
 * aynı (user, client_event_id) daha önce işlendiyse saklanan cevap döner, fn çalışmaz.
 * Kilit önce alındığı için aynı id ile eşzamanlı iki istek de tek kez işlenir.
 */
async function mutateUser(userId, { type, clientEventId = null }, fn) {
  return withTransaction(async (conn) => {
    const user = await lockUser(conn, userId);
    if (clientEventId) {
      const [[prev]] = await conn.query('SELECT type, response FROM client_events WHERE user_id = ? AND client_event_id = ?', [
        userId,
        clientEventId,
      ]);
      if (prev) {
        if (prev.type !== type) throw ApiError.badRequest('client_event_id reused for a different action');
        return JSON.parse(prev.response);
      }
    }
    const result = await fn(conn, user);
    if (clientEventId) {
      await conn.query('INSERT INTO client_events (user_id, client_event_id, type, response) VALUES (?, ?, ?, ?)', [
        userId,
        clientEventId,
        type,
        JSON.stringify(result),
      ]);
    }
    return result;
  });
}

module.exports = { lockUser, userItemIds, changeCoins, creditDailyRewards, buildProgress, getProgress, mutateUser };
