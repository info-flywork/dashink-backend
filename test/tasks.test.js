const test = require('node:test');
const assert = require('node:assert/strict');
const { TASKS, findTask, tasksForPeriod } = require('../src/config/tasks');
const { emptyMetrics, metricsFromRow, evaluateTask, newlyCompletable, METRICS } = require('../src/lib/tasks');

test('görev listesi sözleşmedeki sırada', () => {
  assert.deepEqual(tasksForPeriod('daily').map((t) => t.id), ['daily_play_3', 'daily_coins_50', 'daily_share_1', 'daily_challenge_1', 'daily_score_100']);
  assert.deepEqual(tasksForPeriod('weekly').map((t) => t.id), ['weekly_play_20', 'weekly_challenge_3', 'weekly_coins_300', 'weekly_score_300']);
  assert.deepEqual(tasksForPeriod('achievement').map((t) => t.id), ['ach_score_500', 'ach_games_50', 'ach_coins_1000', 'ach_share_5']);
  assert.ok(TASKS.every((t) => METRICS.includes(t.metric)));
  assert.equal(findTask('ach_score_500').unlocks_item, 'ball_disko');
  assert.equal(findTask('daily_play_3').unlocks_item, null);
  assert.equal(findTask('nope'), null);
});

test('metricsFromRow: NULL/string → sayı', () => {
  const m = metricsFromRow({ d_games: '3', d_max_score: null, d_max_coins: 14, d_sum_coins: '20', d_shares: '1', d_daily_games: '0', d_daily_days: 0 }, 'd');
  assert.deepEqual(m, { games: 3, max_score: 0, max_coins: 14, sum_coins: 20, shares: 1, daily_games: 0, daily_days: 0 });
  assert.deepEqual(metricsFromRow(null, 'd'), emptyMetrics());
});

test('evaluateTask: durumlar ve hedefle sınırlı ilerleme', () => {
  const t = findTask('daily_play_3');
  assert.deepEqual(evaluateTask(t, { ...emptyMetrics(), games: 1 }, false), {
    id: 'daily_play_3', icon: 'play', target: 3, progress: 1, reward: 30, status: 'in_progress', unlocks_item: null,
  });
  assert.equal(evaluateTask(t, { ...emptyMetrics(), games: 5 }, false).status, 'claimable');
  assert.equal(evaluateTask(t, { ...emptyMetrics(), games: 5 }, false).progress, 3);
  assert.equal(evaluateTask(t, { ...emptyMetrics(), games: 5 }, true).status, 'claimed');
  assert.equal(evaluateTask(findTask('ach_score_500'), emptyMetrics(), false).unlocks_item, 'ball_disko');
});

test('newlyCompletable: yalnız bu oyunla eşiği geçenler, claim edilmemişler', () => {
  const z = emptyMetrics();
  const before = { daily: { ...z, games: 2, max_score: 120 }, weekly: { ...z, games: 2 }, achievement: { ...z, games: 2 } };
  const after = { daily: { ...z, games: 3, max_score: 120 }, weekly: { ...z, games: 3 }, achievement: { ...z, games: 3 } };
  assert.deepEqual(newlyCompletable(TASKS, before, after, new Set()), ['daily_play_3']);
  assert.deepEqual(newlyCompletable(TASKS, before, after, new Set(['daily_play_3'])), []);
  // max_score zaten tamamdı → tekrar listelenmez
  assert.ok(!newlyCompletable(TASKS, before, after, new Set()).includes('daily_score_100'));
});
