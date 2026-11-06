const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreViolation, recordOutcome, RECORD_REWARD } = require('../src/lib/score');

test('scoreViolation: süre aralığı', () => {
  assert.equal(scoreViolation({ score: 0, coinsCollected: 0, durationMs: 0 }), 'duration_out_of_range');
  assert.equal(scoreViolation({ score: 0, coinsCollected: 0, durationMs: 3_600_001 }), 'duration_out_of_range');
  assert.equal(scoreViolation({ score: 0, coinsCollected: 0, durationMs: 1 }), null);
  assert.equal(scoreViolation({ score: 0, coinsCollected: 0, durationMs: 3_600_000 }), null);
});

test('scoreViolation: score <= ceil(duration_ms/1000*15) + 5', () => {
  // 42 sn → 630 + 5
  assert.equal(scoreViolation({ score: 635, coinsCollected: 0, durationMs: 42_000 }), null);
  assert.equal(scoreViolation({ score: 636, coinsCollected: 0, durationMs: 42_000 }), 'score_too_high_for_duration');
  // 1 ms → ceil(0.015) = 1 → 6
  assert.equal(scoreViolation({ score: 6, coinsCollected: 0, durationMs: 1 }), null);
  assert.equal(scoreViolation({ score: 7, coinsCollected: 0, durationMs: 1 }), 'score_too_high_for_duration');
  // kayan nokta: 1000 ms → tam 15
  assert.equal(scoreViolation({ score: 20, coinsCollected: 0, durationMs: 1000 }), null);
  assert.equal(scoreViolation({ score: 21, coinsCollected: 0, durationMs: 1000 }), 'score_too_high_for_duration');
});

test('scoreViolation: coins_collected <= floor(score/2) + 5', () => {
  assert.equal(scoreViolation({ score: 128, coinsCollected: 69, durationMs: 42_000 }), null);
  assert.equal(scoreViolation({ score: 128, coinsCollected: 70, durationMs: 42_000 }), 'too_many_coins_for_score');
  assert.equal(scoreViolation({ score: 3, coinsCollected: 6, durationMs: 42_000 }), null);
  assert.equal(scoreViolation({ score: 3, coinsCollected: 7, durationMs: 42_000 }), 'too_many_coins_for_score');
});

test('recordOutcome: ilk oyun rekor değil ama best güncellenir', () => {
  assert.deepEqual(recordOutcome(0, 80), { previous_best: 0, best_score: 80, new_record: false, record_reward: 0, best_improved: true });
});

test('recordOutcome: rekor → 50', () => {
  const r = recordOutcome(112, 128);
  assert.equal(r.new_record, true);
  assert.equal(r.record_reward, RECORD_REWARD);
  assert.equal(r.record_reward, 50);
  assert.equal(r.best_score, 128);
  assert.equal(r.previous_best, 112);
});

test('recordOutcome: eşit veya düşük skor rekor değil', () => {
  assert.equal(recordOutcome(128, 128).new_record, false);
  assert.equal(recordOutcome(128, 100).best_score, 128);
  assert.equal(recordOutcome(128, 100).record_reward, 0);
});
