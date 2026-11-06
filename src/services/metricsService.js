// Görev metrikleri: games / share_events tablolarından gün, hafta ve tüm zamanlar pencereleri tek sorguda.
const { periodWindow } = require('../lib/time');
const { metricsFromRow } = require('../lib/tasks');

const WINDOWS = Object.freeze([
  { prefix: 'd', period: 'daily' },
  { prefix: 'w', period: 'weekly' },
  { prefix: 'a', period: 'achievement' },
]);

function gameColumns(prefix, cond) {
  return [
    `SUM(${cond}) AS ${prefix}_games`,
    `MAX(IF(${cond}, score, NULL)) AS ${prefix}_max_score`,
    `MAX(IF(${cond}, coins_collected, NULL)) AS ${prefix}_max_coins`,
    `SUM(IF(${cond}, coins_collected, 0)) AS ${prefix}_sum_coins`,
    `SUM(${cond} AND mode = 'daily') AS ${prefix}_daily_games`,
    `COUNT(DISTINCT IF(${cond} AND mode = 'daily', daily_date, NULL)) AS ${prefix}_daily_days`,
  ];
}

/**
 * @returns {Promise<{ daily: object, weekly: object, achievement: object }>} lib/tasks METRICS şeklinde
 */
async function loadMetrics(conn, userId, now = new Date()) {
  const gameCols = [];
  const gameParams = [];
  const shareCols = [];
  const shareParams = [];
  for (const w of WINDOWS) {
    const { start } = periodWindow(w.period, now);
    const cond = start ? 'created_at >= ?' : '1';
    // gameColumns her koşulu 6 kez kullanır
    gameCols.push(...gameColumns(w.prefix, `(${cond})`));
    if (start) for (let i = 0; i < 6; i += 1) gameParams.push(start);
    shareCols.push(`SUM(${cond}) AS ${w.prefix}_shares`);
    if (start) shareParams.push(start);
  }
  const [[games]] = await conn.query(`SELECT ${gameCols.join(', ')} FROM games WHERE user_id = ?`, [...gameParams, userId]);
  const [[shares]] = await conn.query(`SELECT ${shareCols.join(', ')} FROM share_events WHERE user_id = ?`, [
    ...shareParams,
    userId,
  ]);
  const row = { ...games, ...shares };
  return Object.fromEntries(WINDOWS.map((w) => [w.period, metricsFromRow(row, w.prefix)]));
}

module.exports = { loadMetrics };
