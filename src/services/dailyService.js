const env = require('../config/env');
const { pool } = require('../db');
const { dayKey, periodWindow } = require('../lib/time');
const { dailySeed, DAILY_REWARD, DAILY_REWARD_TOP } = require('../lib/daily');
const { dailyStanding, dailyParticipants } = require('./leaderboardService');

async function getDaily(userId) {
  const now = new Date();
  const date = dayKey(now);
  const standing = await dailyStanding(pool, date, userId);
  return {
    date,
    seed: dailySeed(env.dailySeedSecret, date),
    participants: await dailyParticipants(pool, date),
    my_best: standing ? standing.best : null,
    my_rank: standing ? standing.rank : null,
    ends_at: periodWindow('daily', now).end.toISOString(),
    reward: DAILY_REWARD,
    reward_top: DAILY_REWARD_TOP,
  };
}

module.exports = { getDaily };
