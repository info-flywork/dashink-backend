// Günlük meydan okuma kuralları (saf).
const crypto = require('crypto');

const DAILY_REWARD = 100; // ilk DAILY_REWARD_TOP içine girene verilen altın
const DAILY_REWARD_TOP = 100;
const DAILY_REWARD_LOOKBACK_DAYS = 7; // en fazla 7 gün geriye bakılır (lazy kredi)

/**
 * Herkese aynı parkur: HMAC-SHA256(secret, 'YYYY-MM-DD') özetinin ilk 31 biti (0 .. 2^31-1).
 * İlk 4 bayt big-endian okunup 1 bit sağa kaydırılır.
 */
function dailySeed(secret, dateKey) {
  if (!secret) throw new Error('DAILY_SEED_SECRET missing');
  const digest = crypto.createHmac('sha256', secret).update(String(dateKey)).digest();
  return digest.readUInt32BE(0) >>> 1;
}

/** Sıra ödüle hak kazandırıyor mu? */
function rankReward(rank, { top = DAILY_REWARD_TOP, reward = DAILY_REWARD } = {}) {
  return Number.isInteger(rank) && rank >= 1 && rank <= top ? reward : 0;
}

module.exports = { DAILY_REWARD, DAILY_REWARD_TOP, DAILY_REWARD_LOOKBACK_DAYS, dailySeed, rankReward };
