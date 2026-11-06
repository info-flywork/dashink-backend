const test = require('node:test');
const assert = require('node:assert/strict');
const {
  randomPlayerName,
  normalizePlayerName,
  toProgress,
  NEW_USER_DEFAULTS,
  PLAYER_NAME_MAX,
} = require('../src/lib/player');

test('randomPlayerName: "Oyuncu " + 4 hane', () => {
  for (let i = 0; i < 200; i += 1) assert.match(randomPlayerName(), /^Oyuncu [1-9]\d{3}$/);
  assert.equal(randomPlayerName(() => 4821), 'Oyuncu 4821');
});

test('normalizePlayerName: trim + geçerli / geçersiz', () => {
  assert.equal(normalizePlayerName('  Zeynep  '), 'Zeynep');
  assert.equal(normalizePlayerName('Oyuncu  4821'), 'Oyuncu 4821');
  assert.equal(normalizePlayerName("O'Brien"), "O'Brien");
  assert.throws(() => normalizePlayerName('A'), (e) => e.code === 'invalid_request');
  assert.throws(() => normalizePlayerName('x'.repeat(PLAYER_NAME_MAX + 1)), (e) => e.code === 'invalid_request');
  assert.throws(() => normalizePlayerName('bad@name'), (e) => e.code === 'invalid_request');
  assert.throws(() => normalizePlayerName(12), (e) => e.code === 'invalid_request');
});

test('toProgress: yeni kullanıcı', () => {
  const user = {
    id: 'u1', name: 'Oyuncu 4821', coins: 0, best_score: 0, games_played: 0, tutorial_seen: 0, premium: 0,
    equipped_ball: 'ball_klasik', equipped_ink: 'ink_lacivert', equipped_theme: 'theme_kagit',
  };
  assert.deepEqual(toProgress(user, []), {
    user: { id: 'u1', name: 'Oyuncu 4821' },
    coins: 0,
    best_score: 0,
    games_played: 0,
    tutorial_seen: false,
    premium: false,
    owned_items: ['ball_klasik', 'ink_lacivert', 'theme_kagit'],
    equipped: { ball: 'ball_klasik', ink: 'ink_lacivert', theme: 'theme_kagit' },
    rewards: [],
  });
  assert.equal(NEW_USER_DEFAULTS.coins, 0);
});

test('toProgress: premium iadesi sonrası kuşanılı premium öğe varsayılana döner', () => {
  const user = { id: 'u1', name: 'x', coins: '5', best_score: '1', games_played: '1', tutorial_seen: 1, premium: 0,
    equipped_ball: 'ball_yildiz', equipped_ink: 'ink_altin', equipped_theme: 'theme_gece' };
  const p = toProgress(user, ['ball_karpuz'], [{ type: 'daily_rank', date: '2026-11-04', rank: 12, coins: 100 }]);
  assert.deepEqual(p.equipped, { ball: 'ball_klasik', ink: 'ink_lacivert', theme: 'theme_kagit' });
  assert.ok(!p.owned_items.includes('ball_yildiz'));
  assert.equal(p.coins, 5);
  assert.equal(p.rewards.length, 1);
});
