const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { dailySeed, rankReward, DAILY_REWARD, DAILY_REWARD_TOP } = require('../src/lib/daily');

test('dailySeed: HMAC-SHA256 ilk 31 bit, deterministik', () => {
  const s = dailySeed('test-secret-123456', '2026-11-05');
  const expected = crypto.createHmac('sha256', 'test-secret-123456').update('2026-11-05').digest().readUInt32BE(0) >>> 1;
  assert.equal(s, expected);
  assert.equal(s, dailySeed('test-secret-123456', '2026-11-05'));
  assert.ok(Number.isInteger(s) && s >= 0 && s < 2 ** 31);
  assert.notEqual(s, dailySeed('test-secret-123456', '2026-11-06'));
  assert.notEqual(s, dailySeed('other-secret-12345', '2026-11-05'));
  assert.throws(() => dailySeed('', '2026-11-05'));
});

test('rankReward: ilk 100 → 100 altın', () => {
  assert.equal(DAILY_REWARD, 100);
  assert.equal(DAILY_REWARD_TOP, 100);
  assert.equal(rankReward(1), 100);
  assert.equal(rankReward(100), 100);
  assert.equal(rankReward(101), 0);
  assert.equal(rankReward(0), 0);
  assert.equal(rankReward(null), 0);
});
