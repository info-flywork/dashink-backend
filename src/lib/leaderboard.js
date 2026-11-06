// Sıralama kuralları (saf). Pencere içindeki her kullanıcının en iyi skoru;
// eşitlikte o skora ÖNCE ulaşan üstte; o da eşitse user_id (deterministik). Sıralar benzersizdir (1, 2, 3 ...).

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const LEADERBOARD_PERIODS = Object.freeze(['daily', 'weekly', 'all']);

function time(v) {
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

/** a, b'den önde mi? (negatif → a önde) */
function compareEntries(a, b) {
  if (b.score !== a.score) return Number(b.score) - Number(a.score);
  const ta = time(a.reached_at);
  const tb = time(b.reached_at);
  if (ta !== tb) return ta - tb;
  return String(a.user_id).localeCompare(String(b.user_id));
}

/** Satırları sıralar ve 1'den başlayan sıra numarası verir. */
function rankEntries(rows) {
  return [...rows].sort(compareEntries).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** API şekli: entries + me. meRow: { rank, name, score } veya null. */
function toLeaderboard(period, rankedRows, meId, meRow) {
  return {
    period,
    entries: rankedRows.map((r) => ({
      rank: r.rank,
      user_id: r.user_id,
      name: r.name,
      score: Number(r.score),
      is_me: r.user_id === meId,
    })),
    me: meRow ? { rank: meRow.rank, name: meRow.name, score: Number(meRow.score) } : null,
  };
}

/** ?limit → 1..100 (varsayılan 50). Geçersizse null. */
function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_LIMIT;
  if (typeof raw !== 'string' || !/^\d{1,4}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_LIMIT ? n : null;
}

module.exports = { DEFAULT_LIMIT, MAX_LIMIT, LEADERBOARD_PERIODS, compareEntries, rankEntries, toLeaderboard, parseLimit };
