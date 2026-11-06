// Görev ilerlemesi (saf): pencere metrikleri + claim bilgisi → görev durumu.
const METRICS = Object.freeze(['games', 'max_score', 'max_coins', 'sum_coins', 'shares', 'daily_games', 'daily_days']);

function emptyMetrics() {
  return Object.fromEntries(METRICS.map((m) => [m, 0]));
}

/**
 * Toplu SQL satırından (ör. d_games, w_max_score, a_shares ...) bir pencerenin metriklerini çıkarır.
 * NULL / string değerler sayıya çevrilir.
 */
function metricsFromRow(row, prefix) {
  const out = emptyMetrics();
  if (!row) return out;
  for (const m of METRICS) {
    const v = Number(row[`${prefix}_${m}`]);
    out[m] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

function taskProgress(task, metrics) {
  return Math.max(0, Number((metrics || {})[task.metric]) || 0);
}

/** API şekli: { id, icon, target, progress, reward, status, unlocks_item } (progress hedefle sınırlı). */
function evaluateTask(task, metrics, claimed) {
  const raw = taskProgress(task, metrics);
  let status = 'in_progress';
  if (claimed) status = 'claimed';
  else if (raw >= task.target) status = 'claimable';
  return {
    id: task.id,
    icon: task.icon,
    target: task.target,
    progress: Math.min(raw, task.target),
    reward: task.reward,
    status,
    unlocks_item: task.unlocks_item || null,
  };
}

function isComplete(task, metrics) {
  return taskProgress(task, metrics) >= task.target;
}

/**
 * Bu oyunla tamamlanabilir hâle gelen görevler: önce hedefin altında, sonra hedefte/üstünde ve claim edilmemiş.
 * @param tasks görev tanımları
 * @param before/after { [period]: metrics }
 * @param claimedIds Set<task_id> (geçerli pencerede claim edilmiş)
 */
function newlyCompletable(tasks, before, after, claimedIds) {
  return tasks
    .filter((t) => !claimedIds.has(t.id) && !isComplete(t, before[t.period]) && isComplete(t, after[t.period]))
    .map((t) => t.id);
}

module.exports = { METRICS, emptyMetrics, metricsFromRow, taskProgress, evaluateTask, isComplete, newlyCompletable };
