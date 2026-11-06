// UTC gün/hafta pencereleri (saf). Gün 00:00 UTC'de, hafta pazartesi 00:00 UTC'de başlar.
const DAY_MS = 24 * 3600 * 1000;

function utcDayStart(now = new Date()) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Pazartesi 00:00 UTC (getUTCDay: 0 = pazar). */
function utcWeekStart(now = new Date()) {
  const day = utcDayStart(now);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS);
}

function addDays(date, n) {
  return new Date(new Date(date).getTime() + n * DAY_MS);
}

/** Date → 'YYYY-MM-DD' (UTC). */
function dayKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' geçerli bir takvim günü mü? */
function isDayKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && dayKey(d) === value;
}

/** 'YYYY-MM-DD' → o günün 00:00 UTC Date'i. */
function dayKeyToDate(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * Görev / sıralama penceresi.
 * period: daily | weekly | achievement | all
 * @returns {{ period, start: Date|null, end: Date|null, key: string, resetsAt: Date|null }}
 *  key = task_claims.period_key: günlükte YYYY-MM-DD, haftalıkta pazartesinin YYYY-MM-DD'si, diğerlerinde 'all'.
 */
function periodWindow(period, now = new Date()) {
  if (period === 'daily') {
    const start = utcDayStart(now);
    const end = addDays(start, 1);
    return { period, start, end, key: dayKey(start), resetsAt: end };
  }
  if (period === 'weekly') {
    const start = utcWeekStart(now);
    const end = addDays(start, 7);
    return { period, start, end, key: dayKey(start), resetsAt: end };
  }
  if (period === 'achievement' || period === 'all') {
    return { period, start: null, end: null, key: 'all', resetsAt: null };
  }
  throw new RangeError(`unknown period: ${period}`);
}

/** Lazy günlük ödül için bakılacak geçmiş günler: dün .. `lookbackDays` gün önce (bugün hariç, yeniden eskiye). */
function pastDayKeys(now = new Date(), lookbackDays = 7) {
  const today = utcDayStart(now);
  const out = [];
  for (let i = 1; i <= lookbackDays; i += 1) out.push(dayKey(addDays(today, -i)));
  return out;
}

module.exports = { DAY_MS, utcDayStart, utcWeekStart, addDays, dayKey, isDayKey, dayKeyToDate, periodWindow, pastDayKeys };
