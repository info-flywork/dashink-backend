// Premium + consumable coin paketleri — webhook ve /purchases/sync aynı fonksiyonları kullanır.
// Premium bonus: purchase_grants (user_id, product_id) UNIQUE → bir kez.
// Coin paketleri: iap_coin_grants.transaction_id UNIQUE → aynı paket tekrar alınabilir.
const { pool, withTransaction } = require('../db');
const { PREMIUM, findCoinPack } = require('../config/catalog');
const { PREMIUM_ITEM_IDS, DEFAULT_EQUIPPED } = require('../lib/items');
const { premiumFromSubscriber, coinPacksFromSubscriber } = require('../lib/revenueCat');
const { lockUser, changeCoins, buildProgress, userItemIds } = require('./userService');
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

/** İade/iptal: premium kalkar, kuşanılı premium öğeler (altınla alınmadıysa) varsayılana döner; bonus geri alınmaz. */
async function revokePremium(userId, { raw } = {}) {
  return withTransaction(async (conn) => {
    const user = await lockUser(conn, userId);
    await conn.query(
      "UPDATE purchase_grants SET status = 'revoked', revoked_at = NOW(3), revoke_raw = ? WHERE user_id = ? AND product_id = ? AND status = 'granted'",
      [stringify(raw), userId, PREMIUM.product_id],
    );
    if (!Number(user.premium)) return { revoked: false };
    const coinOwned = new Set(await userItemIds(conn, userId)); // altınla alınan premium öğe kalır
    const sets = ['premium = 0'];
    const params = [];
    for (const [category, column] of Object.entries(EQUIP_COLUMNS)) {
      if (PREMIUM_ITEM_IDS.includes(user[column]) && !coinOwned.has(user[column])) {
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
 * Consumable coin paketi yükler. Aynı transaction_id tekrar gelirse dokunulmaz.
 * @returns {{ granted: boolean, coins: number, duplicate: boolean }}
 */
async function grantCoinPackLocked(
  conn,
  user,
  { productId, coins, transactionId, source, environment = null, raw },
) {
  if (!transactionId) {
    logger.warn('coin_pack.missing_transaction', { user_id: user.id, product_id: productId });
    return { granted: false, coins: 0, duplicate: false };
  }
  const [[existing]] = await conn.query(
    'SELECT id, status FROM iap_coin_grants WHERE transaction_id = ? FOR UPDATE',
    [transactionId],
  );
  // Kayıt varsa (granted veya iade edilmiş/tombstone) asla tekrar yüklenmez:
  // RevenueCat iade sonrası da işlemi non_subscriptions'ta listeleyebilir; sync onu yeniden yüklememeli.
  if (existing) return { granted: false, coins: 0, duplicate: true };

  await conn.query(
    `INSERT INTO iap_coin_grants (user_id, product_id, transaction_id, coins, source, status, environment, raw)
     VALUES (?, ?, ?, ?, ?, 'granted', ?, ?)`,
    [user.id, productId, transactionId, coins, source, environment, stringify(raw)],
  );
  await changeCoins(conn, user, coins, 'iap_coins', transactionId);
  logger.info('coin_pack.granted', {
    user_id: user.id,
    product_id: productId,
    coins,
    transaction_id: transactionId,
    source,
  });
  return { granted: true, coins, duplicate: false };
}

async function grantCoinPack(userId, opts) {
  try {
    return await withTransaction(async (conn) => grantCoinPackLocked(conn, await lockUser(conn, userId), opts));
  } catch (err) {
    // Aynı işlem eşzamanlı olarak başka bir kullanıcı kilidi altında yazıldıysa (ör. TRANSFER).
    if (err && err.code === 'ER_DUP_ENTRY') return { granted: false, coins: 0, duplicate: true };
    throw err;
  }
}

/**
 * Coin paketi iadesi: mümkünse bakiyeden düşer (eksiye inmez), kaydı revoked yapar.
 * İade, yükleme olayından önce gelirse 0 coin'lik 'revoked' kayıt (tombstone) bırakılır;
 * böylece sonraki webhook/sync o işlemi yüklemez. Yalnız transaction_id ile eşleşilir
 * (aynı üründen başka bir satın alımı yanlışlıkla geri almamak için).
 * @returns {{ revoked: boolean, coins: number, reason?: string }}
 */
async function revokeCoinPack(userId, { productId, transactionId, environment = null, raw } = {}) {
  if (!transactionId) {
    logger.warn('coin_pack.revoke_missing_transaction', { user_id: userId, product_id: productId });
    return { revoked: false, coins: 0, reason: 'no_transaction' };
  }
  return withTransaction(async (conn) => {
    const [[owner]] = await conn.query('SELECT user_id FROM iap_coin_grants WHERE transaction_id = ?', [
      transactionId,
    ]);
    const ownerId = owner ? owner.user_id : userId;
    const user = await lockUser(conn, ownerId); // kilit sırası: önce kullanıcı, sonra işlem
    const [[grant]] = await conn.query('SELECT * FROM iap_coin_grants WHERE transaction_id = ? FOR UPDATE', [
      transactionId,
    ]);
    if (!grant) {
      await conn.query(
        `INSERT INTO iap_coin_grants
           (user_id, product_id, transaction_id, coins, source, status, environment, raw, revoked_at, revoke_raw)
         VALUES (?, ?, ?, 0, 'webhook', 'revoked', ?, NULL, NOW(3), ?)`,
        [ownerId, findCoinPack(productId)?.product_id || productId || 'unknown', transactionId, environment, stringify(raw)],
      );
      logger.warn('coin_pack.refund_before_grant', { user_id: ownerId, transaction_id: transactionId });
      return { revoked: false, coins: 0, reason: 'tombstoned' };
    }
    if (grant.status !== 'granted') return { revoked: false, coins: 0, reason: 'already_revoked' };

    const clawback = Math.min(Number(grant.coins), Number(user.coins));
    if (clawback > 0) {
      await changeCoins(conn, user, -clawback, 'iap_coins_refund', grant.transaction_id);
    }
    await conn.query(
      "UPDATE iap_coin_grants SET status = 'revoked', revoked_at = NOW(3), revoke_raw = ? WHERE id = ?",
      [stringify(raw), grant.id],
    );
    logger.info('coin_pack.revoked', {
      user_id: ownerId,
      product_id: grant.product_id,
      coins: clawback,
      transaction_id: grant.transaction_id,
    });
    return { revoked: true, coins: clawback };
  });
}

/**
 * RevenueCat REST ile entitlement + coin pack senkronu.
 * Premium aktifse verilir (aktif değilse dokunulmaz — geri alma yalnız iade webhook'u).
 * Coin paketleri transaction_id ile eksik kalanlar yüklenir.
 * @returns PlayerProgress
 */
async function syncFromRevenueCat(userId) {
  const response = await revenueCatClient.getSubscriber(userId);
  const p = premiumFromSubscriber(response);
  const packs = coinPacksFromSubscriber(response);
  return withTransaction(async (conn) => {
    const user = await lockUser(conn, userId);
    if (p.active) {
      await grantPremiumLocked(conn, user, {
        transactionId: p.transactionId,
        source: 'sync',
        environment: p.environment,
        raw: response.subscriber,
      });
    }
    for (const pack of packs) {
      await grantCoinPackLocked(conn, user, {
        productId: pack.productId,
        coins: pack.coins,
        transactionId: pack.transactionId,
        source: 'sync',
        environment: pack.environment,
        raw: response.subscriber,
      });
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

module.exports = {
  grantPremium,
  revokePremium,
  grantCoinPack,
  revokeCoinPack,
  syncFromRevenueCat,
  resolveUserId,
};
