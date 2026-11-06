// Premium (tek non-consumable ürün) ver / geri al — webhook ve /purchases/sync aynı fonksiyonları kullanır.
// Bonus coin purchase_grants (user_id, product_id) UNIQUE ile bir kez yüklenir; iadede geri ALINMAZ.
const { pool, withTransaction } = require('../db');
const { PREMIUM } = require('../config/catalog');
const { PREMIUM_ITEM_IDS, DEFAULT_EQUIPPED } = require('../lib/items');
const { premiumFromSubscriber } = require('../lib/revenueCat');
const { lockUser, changeCoins, buildProgress } = require('./userService');
const { EQUIP_COLUMNS } = require('./shopService');
const revenueCatClient = require('./revenueCatClient');
const logger = require('../logger');

function stringify(raw) {
  try {
    return raw === undefined ? null : JSON.stringify(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Kilitli kullanıcıya premium verir (idempotent).
 * @returns {{ granted: boolean, bonus: number }}
 */
async function grantPremiumLocked(conn, user, { transactionId = null, source, environment = null, raw }) {
  const [[grant]] = await conn.query('SELECT * FROM purchase_grants WHERE user_id = ? AND product_id = ? FOR UPDATE', [
    user.id,
    PREMIUM.product_id,
  ]);
  let bonus = 0;
  if (!grant) {
    bonus = PREMIUM.bonus_coins;
    await conn.query(
      `INSERT INTO purchase_grants (user_id, product_id, transaction_id, bonus_coins, source, status, environment, raw)
       VALUES (?, ?, ?, ?, ?, 'granted', ?, ?)`,
      [user.id, PREMIUM.product_id, transactionId, bonus, source, environment, stringify(raw)],
    );
    await changeCoins(conn, user, bonus, 'premium_bonus', transactionId || PREMIUM.product_id);
  } else if (grant.status !== 'granted') {
    await conn.query(
      "UPDATE purchase_grants SET status = 'granted', transaction_id = COALESCE(?, transaction_id), revoked_at = NULL WHERE id = ?",
      [transactionId, grant.id],
    );
  }
  const changed = !Number(user.premium);
  if (changed) {
    await conn.query('UPDATE users SET premium = 1 WHERE id = ?', [user.id]);
    user.premium = 1;
    logger.info('premium.granted', { user_id: user.id, transaction_id: transactionId, source, bonus });
  }
  return { granted: changed, bonus };
}

async function grantPremium(userId, opts) {
  return withTransaction(async (conn) => grantPremiumLocked(conn, await lockUser(conn, userId), opts));
}

/** İade/iptal: premium kalkar, kuşanılı premium öğeler varsayılana döner; bonus geri alınmaz. */
async function revokePremium(userId, { raw } = {}) {
  return withTransaction(async (conn) => {
    const user = await lockUser(conn, userId);
    await conn.query(
      "UPDATE purchase_grants SET status = 'revoked', revoked_at = NOW(3), revoke_raw = ? WHERE user_id = ? AND product_id = ? AND status = 'granted'",
      [stringify(raw), userId, PREMIUM.product_id],
    );
    if (!Number(user.premium)) return { revoked: false };
    const sets = ['premium = 0'];
    const params = [];
    for (const [category, column] of Object.entries(EQUIP_COLUMNS)) {
      if (PREMIUM_ITEM_IDS.includes(user[column])) {
        sets.push(`${column} = ?`);
        params.push(DEFAULT_EQUIPPED[category]);
      }
    }
    await conn.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, userId]);
    logger.info('premium.revoked', { user_id: userId });
    return { revoked: true };
  });
}

/**
 * RevenueCat REST ile entitlement kontrolü; aktifse premium verilir. Aktif değilse dokunulmaz
 * (geri alma yalnızca iade webhook'u ile). @returns PlayerProgress
 */
async function syncFromRevenueCat(userId) {
  const response = await revenueCatClient.getSubscriber(userId);
  const p = premiumFromSubscriber(response);
  return withTransaction(async (conn) => {
    const user = await lockUser(conn, userId);
    if (p.active) {
      await grantPremiumLocked(conn, user, { transactionId: p.transactionId, source: 'sync', environment: p.environment, raw: response.subscriber });
    }
    return buildProgress(conn, user);
  });
}

/** Webhook kararındaki aday id'lerden DB'de var olan ilk kullanıcı. */
async function resolveUserId(candidateIds) {
  if (!candidateIds.length) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE id IN (?)', [candidateIds]);
  const existing = new Set(rows.map((r) => r.id));
  return candidateIds.find((id) => existing.has(id)) || null;
}

module.exports = { grantPremium, revokePremium, syncFromRevenueCat, resolveUserId };
