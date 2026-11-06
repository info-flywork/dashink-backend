// Oyun sonucu doğrulama ve rekor hesabı (saf).
const RECORD_REWARD = 50;
const MAX_DURATION_MS = 3_600_000;

/**
 * Hile sınırları (sözleşme). Aşılırsa 422 invalid_score.
 *  - duration_ms 1 .. 3 600 000
 *  - score <= ceil(duration_ms / 1000 * 15) + 5   (saniyede en fazla 15 puan)
 *  - coins_collected <= floor(score / 2) + 5
 * @returns {string|null} ihlal açıklaması veya null (geçerli)
 */
function scoreViolation({ score, coinsCollected, durationMs }) {
  if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > MAX_DURATION_MS) return 'duration_out_of_range';
  // durationMs * 15 tam sayı; / 1000 sonrası ceil (kayan nokta hatasından kaçınmak için önce çarp).
  if (score > Math.ceil((durationMs * 15) / 1000) + 5) return 'score_too_high_for_duration';
  if (coinsCollected > Math.floor(score / 2) + 5) return 'too_many_coins_for_score';
  return null;
}

/**
 * Rekor: score > previous_best VE previous_best > 0 (ilk oyun rekor sayılmaz ama best güncellenir).
 */
function recordOutcome(previousBest, score) {
  const prev = Number(previousBest) || 0;
  const newRecord = score > prev && prev > 0;
  return {
    previous_best: prev,
    best_score: Math.max(prev, score),
    new_record: newRecord,
    record_reward: newRecord ? RECORD_REWARD : 0,
    best_improved: score > prev,
  };
}

module.exports = { RECORD_REWARD, MAX_DURATION_MS, scoreViolation, recordOutcome };
