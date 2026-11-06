const test = require('node:test');
const assert = require('node:assert/strict');
const t = require('../src/lib/time');

const NOW = new Date('2026-11-05T13:45:10.123Z'); // perşembe

test('utcDayStart / dayKey', () => {
  assert.equal(t.utcDayStart(NOW).toISOString(), '2026-11-05T00:00:00.000Z');
  assert.equal(t.dayKey(NOW), '2026-11-05');
  assert.equal(t.dayKey(new Date('2026-11-05T23:59:59.999Z')), '2026-11-05');
});

test('utcWeekStart: pazartesi 00:00 UTC', () => {
  assert.equal(t.utcWeekStart(NOW).toISOString(), '2026-11-02T00:00:00.000Z');
  assert.equal(t.utcWeekStart(new Date('2026-11-02T00:00:00.000Z')).toISOString(), '2026-11-02T00:00:00.000Z');
  // pazar → önceki pazartesi
  assert.equal(t.utcWeekStart(new Date('2026-11-08T23:59:59.999Z')).toISOString(), '2026-11-02T00:00:00.000Z');
  assert.equal(t.utcWeekStart(new Date('2026-11-09T00:00:00.000Z')).toISOString(), '2026-11-09T00:00:00.000Z');
  // yıl sınırı
  assert.equal(t.utcWeekStart(new Date('2027-01-01T10:00:00Z')).toISOString(), '2026-12-28T00:00:00.000Z');
});

test('periodWindow: key ve resets_at', () => {
  const d = t.periodWindow('daily', NOW);
  assert.equal(d.key, '2026-11-05');
  assert.equal(d.resetsAt.toISOString(), '2026-11-06T00:00:00.000Z');
  const w = t.periodWindow('weekly', NOW);
  assert.equal(w.key, '2026-11-02');
  assert.equal(w.start.toISOString(), '2026-11-02T00:00:00.000Z');
  assert.equal(w.resetsAt.toISOString(), '2026-11-09T00:00:00.000Z');
  const a = t.periodWindow('achievement', NOW);
  assert.deepEqual([a.key, a.start, a.resetsAt], ['all', null, null]);
  assert.equal(t.periodWindow('all', NOW).key, 'all');
  assert.throws(() => t.periodWindow('monthly', NOW), RangeError);
});

test('pastDayKeys: dünden geriye 7 gün, bugün hariç', () => {
  const keys = t.pastDayKeys(NOW, 7);
  assert.equal(keys.length, 7);
  assert.equal(keys[0], '2026-11-04');
  assert.equal(keys[6], '2026-10-29');
  assert.ok(!keys.includes('2026-11-05'));
});

test('isDayKey', () => {
  assert.equal(t.isDayKey('2026-11-05'), true);
  assert.equal(t.isDayKey('2026-02-30'), false);
  assert.equal(t.isDayKey('2026-11-5'), false);
  assert.equal(t.isDayKey(null), false);
  assert.equal(t.dayKeyToDate('2026-11-05').toISOString(), '2026-11-05T00:00:00.000Z');
});
