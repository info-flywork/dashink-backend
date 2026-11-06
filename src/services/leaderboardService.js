// Sıralama sorguları. Kaynak (source): user_id, score, reached_at sütunlu türetilmiş tablo.
// Sıra kuralı lib/leaderboard.js ile aynı: score DESC, reached_at ASC, user_id ASC.
const { pool } = require('../db');
const { periodWindow } = require('../lib/time');
const { rankEntries, toLeaderboard } = require('../lib/leaderboard');

/** Filtreye uyan oyunlarda her kullanıcının en iyi skoru ve o skora ilk ulaştığı an. */
function bestPerUser(where, params) {
  return {
    sql: `SELECT g.user_id, g.score, MIN(g.created_at) AS reached_at
            FROM games g
            JOIN (SELECT x.user_id, MAX(x.score) AS best FROM games x WHERE ${where('x')} GROUP BY x.user_id) b
              ON b.user_id = g.user_id AND g.score = b.best
           WHERE ${where('g')}
           GROUP BY g.user_id, g.score`,
    params: [...params, ...params],
  };
}

/** [start, end) zaman penceresi, tüm modlar (günlük / haftalık sıralama). */
function windowSource(start, end) {
  return bestPerUser((a) => `${a}.created_at >= ? AND ${a}.created_at < ?`, [start, end]);
}

/** Günlük meydan okuma: mode = daily ve daily_date = gün. */
function dailyChallengeSource(dateKey) {
  return bestPerUser((a) => `${a}.mode = 'daily' AND ${a}.daily_date = ?`, [dateKey]);
}

/** Tüm zamanlar: users.best_score / best_score_at (en az bir oyun oynamış kullanıcılar). */
function allTimeSource() {
  return {
    sql: 'SELECT id AS user_id, best_score AS score, best_score_at AS reached_at FROM users WHERE games_played > 0',
    params: [],
  };
}

function sourceForPeriod(period, now = new Date()) {
  if (period === 'all') return allTimeSource();
  const w = periodWindow(period, now);
  return windowSource(w.start, w.end);
}

async function topEntries(conn, source, limit) {
  const [rows] = await conn.query(
    `SELECT r.user_id, r.score, r.reached_at, u.name
       FROM (${source.sql}) r
       JOIN users u ON u.id = r.user_id
      ORDER BY r.score DESC, r.reached_at ASC, r.user_id ASC
      LIMIT ?`,
    [...source.params, limit],
  );
  return rankEntries(rows.map((r) => ({ ...r, score: Number(r.score) })));
}

/** Kullanıcının kaynaktaki yeri: { rank, score, reached_at } veya null (pencerede oyunu yok). */
async function rankOf(conn, source, userId) {
  const [[mine]] = await conn.query(`SELECT r.score, r.reached_at FROM (${source.sql}) r WHERE r.user_id = ?`, [
    ...source.params,
    userId,
  ]);
  if (!mine) return null;
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS ahead FROM (${source.sql}) r
      WHERE r.score > ? OR (r.score = ? AND (r.reached_at < ? OR (r.reached_at = ? AND r.user_id < ?)))`,
    [...source.params, mine.score, mine.score, mine.reached_at, mine.reached_at, userId],
  );
  return { rank: Number(row.ahead) + 1, score: Number(mine.score), reached_at: mine.reached_at };
}

async function getLeaderboard(userId, { period, limit }) {
  const source = sourceForPeriod(period);
  const entries = await topEntries(pool, source, limit);
  let me = null;
  const fromTop = entries.find((e) => e.user_id === userId);
  if (fromTop) {
    me = { rank: fromTop.rank, name: fromTop.name, score: fromTop.score };
  } else {
    const r = await rankOf(pool, source, userId);
    if (r) {
      const [[u]] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
      me = { rank: r.rank, name: u ? u.name : null, score: r.score };
    }
  }
  return toLeaderboard(period, entries, userId, me);
}

/** Günlük meydan okumada kullanıcının en iyisi ve sırası; oynamadıysa null. */
async function dailyStanding(conn, dateKey, userId) {
  const r = await rankOf(conn, dailyChallengeSource(dateKey), userId);
  return r ? { best: r.score, rank: r.rank } : null;
}

async function dailyParticipants(conn, dateKey) {
  const [[row]] = await conn.query(
    "SELECT COUNT(DISTINCT user_id) AS n FROM games WHERE mode = 'daily' AND daily_date = ?",
    [dateKey],
  );
  return Number(row.n);
}

module.exports = {
  windowSource,
  dailyChallengeSource,
  allTimeSource,
  sourceForPeriod,
  topEntries,
  rankOf,
  getLeaderboard,
  dailyStanding,
  dailyParticipants,
};
