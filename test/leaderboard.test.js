const test = require('node:test');
const assert = require('node:assert/strict');
const { rankEntries, toLeaderboard, parseLimit, compareEntries } = require('../src/lib/leaderboard');

const A = 'aaaaaaaa-0000-4000-8000-000000000000';
const B = 'bbbbbbbb-0000-4000-8000-000000000000';
const C = 'cccccccc-0000-4000-8000-000000000000';

test('rankEntries: skor DESC, eşitlikte önce ulaşan üstte, sonra user_id', () => {
  const rows = [
    { user_id: C, name: 'C', score: 100, reached_at: new Date('2026-11-05T10:00:00Z') },
    { user_id: B, name: 'B', score: 100, reached_at: new Date('2026-11-05T09:00:00Z') },
    { user_id: A, name: 'A', score: 50, reached_at: new Date('2026-11-05T08:00:00Z') },
    { user_id: A.replace('a', 'd'), name: 'D', score: 100, reached_at: new Date('2026-11-05T09:00:00Z') },
  ];
  const ranked = rankEntries(rows);
  assert.deepEqual(ranked.map((r) => [r.name, r.rank]), [['B', 1], ['D', 2], ['C', 3], ['A', 4]]);
  assert.ok(compareEntries(rows[1], rows[0]) < 0);
});

test('toLeaderboard: is_me ve me', () => {
  const ranked = rankEntries([{ user_id: A, name: 'Zeynep', score: 1024, reached_at: '2026-11-05T00:00:00Z' }]);
  const lb = toLeaderboard('daily', ranked, B, { rank: 24, name: 'Oyuncu 4821', score: 312 });
  assert.deepEqual(lb, {
    period: 'daily',
    entries: [{ rank: 1, user_id: A, name: 'Zeynep', score: 1024, is_me: false }],
    me: { rank: 24, name: 'Oyuncu 4821', score: 312 },
  });
  assert.equal(toLeaderboard('all', [], B, null).me, null);
});

test('parseLimit: 1..100, varsayılan 50', () => {
  assert.equal(parseLimit(undefined), 50);
  assert.equal(parseLimit(''), 50);
  assert.equal(parseLimit('1'), 1);
  assert.equal(parseLimit('100'), 100);
  assert.equal(parseLimit('0'), null);
  assert.equal(parseLimit('101'), null);
  assert.equal(parseLimit('abc'), null);
  assert.equal(parseLimit(['5']), null);
});
