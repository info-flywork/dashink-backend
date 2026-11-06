// Oyuncu kuralları (saf): yeni kullanıcı varsayılanları, ad üretimi, PlayerProgress şekli.
const crypto = require('crypto');
const { ApiError } = require('./apiError');
const { DEFAULT_EQUIPPED, ownedItemIds, resolveEquipped } = require('./items');

const NEW_USER_DEFAULTS = Object.freeze({
  coins: 0,
  best_score: 0,
  games_played: 0,
  tutorial_seen: false,
  premium: false,
  equipped: DEFAULT_EQUIPPED,
});

/** DB `users.name` VARCHAR(32) ile aynı sınırlar. */
const PLAYER_NAME_MIN = 2;
const PLAYER_NAME_MAX = 32;

/** Harf (unicode), rakam, boşluk, _ - . ' */
const PLAYER_NAME_RE = /^[\p{L}\p{N} _.\-']+$/u;

/** "Oyuncu " + 4 haneli sayı (1000..9999). */
function randomPlayerName(randomInt = crypto.randomInt) {
  return `Oyuncu ${randomInt(1000, 10000)}`;
}

/**
 * Oyuncu görünen adını normalize eder. Geçersizse 400 invalid_request.
 * Trim + iç boşlukları tek boşluğa indirger.
 */
function normalizePlayerName(raw) {
  if (typeof raw !== 'string') throw ApiError.badRequest('name must be a string');
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < PLAYER_NAME_MIN || name.length > PLAYER_NAME_MAX) {
    throw ApiError.badRequest(`name length must be ${PLAYER_NAME_MIN}..${PLAYER_NAME_MAX}`);
  }
  if (!PLAYER_NAME_RE.test(name)) throw ApiError.badRequest('name has invalid characters');
  return name;
}

function publicUser(user) {
  return { id: user.id, name: user.name };
}

/**
 * users satırı + user_items id'leri + yeni yüklenen ödüller → PlayerProgress.
 */
function toProgress(user, userItemIds, rewards = []) {
  const premium = Boolean(Number(user.premium));
  const owned = ownedItemIds(userItemIds, premium);
  return {
    user: publicUser(user),
    coins: Number(user.coins),
    best_score: Number(user.best_score),
    games_played: Number(user.games_played),
    tutorial_seen: Boolean(Number(user.tutorial_seen)),
    premium,
    owned_items: owned,
    equipped: resolveEquipped({ ball: user.equipped_ball, ink: user.equipped_ink, theme: user.equipped_theme }, owned),
    rewards,
  };
}

module.exports = {
  NEW_USER_DEFAULTS,
  PLAYER_NAME_MIN,
  PLAYER_NAME_MAX,
  randomPlayerName,
  normalizePlayerName,
  publicUser,
  toProgress,
};
