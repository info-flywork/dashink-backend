// Görev tanımları (sözleşmeyle birebir, SIRA ÖNEMLİ).
// metric: games | max_score | max_coins | sum_coins | shares | daily_games | daily_days
// İlerleme lib/tasks.js'te pencere metriklerinden hesaplanır.

const PERIODS = Object.freeze(['daily', 'weekly', 'achievement']);

const TASKS = Object.freeze(
  [
    // Günlük (00:00 UTC'de yenilenir)
    { id: 'daily_play_3', period: 'daily', icon: 'play', metric: 'games', target: 3, reward: 30 },
    { id: 'daily_coins_50', period: 'daily', icon: 'trophy', metric: 'max_coins', target: 50, reward: 50 },
    { id: 'daily_share_1', period: 'daily', icon: 'share', metric: 'shares', target: 1, reward: 40 },
    { id: 'daily_challenge_1', period: 'daily', icon: 'calendar', metric: 'daily_games', target: 1, reward: 30 },
    { id: 'daily_score_100', period: 'daily', icon: 'crown', metric: 'max_score', target: 100, reward: 30 },
    // Haftalık (pazartesi 00:00 UTC'de yenilenir)
    { id: 'weekly_play_20', period: 'weekly', icon: 'play', metric: 'games', target: 20, reward: 150 },
    { id: 'weekly_challenge_3', period: 'weekly', icon: 'calendar', metric: 'daily_days', target: 3, reward: 120 },
    { id: 'weekly_coins_300', period: 'weekly', icon: 'coin', metric: 'sum_coins', target: 300, reward: 100 },
    { id: 'weekly_score_300', period: 'weekly', icon: 'crown', metric: 'max_score', target: 300, reward: 150 },
    // Başarımlar (yenilenmez; kolaydan zora)
    { id: 'ach_games_10', period: 'achievement', icon: 'play', metric: 'games', target: 10, reward: 50 },
    { id: 'ach_score_500', period: 'achievement', icon: 'crown', metric: 'max_score', target: 500, reward: 100, unlocks_item: 'ball_disko' },
    { id: 'ach_games_50', period: 'achievement', icon: 'play', metric: 'games', target: 50, reward: 200 },
    { id: 'ach_coins_1000', period: 'achievement', icon: 'coin', metric: 'sum_coins', target: 1000, reward: 200 },
    { id: 'ach_run_coins_100', period: 'achievement', icon: 'trophy', metric: 'max_coins', target: 100, reward: 150 },
    { id: 'ach_share_5', period: 'achievement', icon: 'share', metric: 'shares', target: 5, reward: 100 },
    { id: 'ach_daily_7', period: 'achievement', icon: 'calendar', metric: 'daily_days', target: 7, reward: 200 },
    { id: 'ach_score_1000', period: 'achievement', icon: 'crown', metric: 'max_score', target: 1000, reward: 300 },
    { id: 'ach_games_200', period: 'achievement', icon: 'play', metric: 'games', target: 200, reward: 400 },
    { id: 'ach_coins_5000', period: 'achievement', icon: 'coin', metric: 'sum_coins', target: 5000, reward: 500 },
    { id: 'ach_share_20', period: 'achievement', icon: 'share', metric: 'shares', target: 20, reward: 300 },
    { id: 'ach_daily_30', period: 'achievement', icon: 'calendar', metric: 'daily_days', target: 30, reward: 600 },
  ].map((t) => Object.freeze({ unlocks_item: null, ...t })),
);

function findTask(id) {
  return TASKS.find((t) => t.id === id) || null;
}

function tasksForPeriod(period) {
  return TASKS.filter((t) => t.period === period);
}

module.exports = { PERIODS, TASKS, findTask, tasksForPeriod };
