const { pool } = require('../db');
const { ApiError, CODES } = require('../lib/apiError');
const { findTask, tasksForPeriod } = require('../config/tasks');
const { periodWindow } = require('../lib/time');
const { evaluateTask, isComplete } = require('../lib/tasks');
const { loadMetrics } = require('./metricsService');
const { mutateUser, changeCoins } = require('./userService');
const logger = require('../logger');

async function claimedIn(conn, userId, periodKey) {
  const [rows] = await conn.query('SELECT task_id FROM task_claims WHERE user_id = ? AND period_key = ?', [userId, periodKey]);
  return new Set(rows.map((r) => r.task_id));
}

async function listTasks(userId, period) {
  const now = new Date();
  const w = periodWindow(period, now);
  const metrics = (await loadMetrics(pool, userId, now))[period];
  const claimed = await claimedIn(pool, userId, w.key);
  return {
    period,
    resets_at: w.resetsAt ? w.resetsAt.toISOString() : null,
    tasks: tasksForPeriod(period).map((t) => evaluateTask(t, metrics, claimed.has(t.id))),
  };
}

async function claim(userId, taskId) {
  const task = findTask(taskId);
  if (!task) throw ApiError.notFound(`unknown task ${taskId}`);
  return mutateUser(userId, { type: 'task_claim' }, async (conn, user) => {
    const now = new Date();
    const w = periodWindow(task.period, now);
    const [[prev]] = await conn.query('SELECT id FROM task_claims WHERE user_id = ? AND task_id = ? AND period_key = ?', [
      userId,
      task.id,
      w.key,
    ]);
    if (prev) throw ApiError.conflict(CODES.ALREADY_CLAIMED);
    const metrics = (await loadMetrics(conn, userId, now))[task.period];
    if (!isComplete(task, metrics)) throw ApiError.conflict(CODES.TASK_NOT_COMPLETE);

    await conn.query('INSERT INTO task_claims (user_id, task_id, period_key, reward) VALUES (?, ?, ?, ?)', [
      userId,
      task.id,
      w.key,
      task.reward,
    ]);
    await changeCoins(conn, user, task.reward, 'task_reward', `${task.id}:${w.key}`);
    if (task.unlocks_item) {
      await conn.query("INSERT IGNORE INTO user_items (user_id, item_id, source) VALUES (?, ?, 'task')", [userId, task.unlocks_item]);
    }
    logger.info('task.claimed', { user_id: userId, task_id: task.id, period_key: w.key, reward: task.reward });
    return {
      task: evaluateTask(task, metrics, true),
      coins: Number(user.coins),
      unlocked_item: task.unlocks_item || null,
    };
  });
}

module.exports = { listTasks, claim };
