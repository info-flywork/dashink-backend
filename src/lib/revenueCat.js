// RevenueCat olay/cevap ayrıştırma (saf, DB'siz). Premium / coin pack kararları burada.
const { PREMIUM, findCoinPack } = require('../config/catalog');
const { isPremiumProduct, isCoinPackProduct } = require('./items');

const GRANT_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']);
// RevenueCat iadeleri çoğunlukla CANCELLATION (cancel_reason=CUSTOMER_SUPPORT) olarak gönderir; REFUND da kabul edilir.
const REVOKE_EVENT_TYPES = new Set(['CANCELLATION', 'REFUND']);
// TRANSFER: satın alımlar başka app_user_id'ye taşındı → hedef kullanıcıya premium (REST ile doğrulanarak).
const TRANSFER_EVENT_TYPE = 'TRANSFER';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

function str(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function uniqueUuids(ids) {
  return [...new Set(ids.filter(isUuid).map((s) => s.toLowerCase()))];
}

/** Olaydaki tüm kullanıcı kimlikleri (app_user_id, original_app_user_id, aliases, transferred_to); yalnız UUID olanlar. */
function candidateUserIds(event) {
  const ids = [event.app_user_id, event.original_app_user_id]
    .concat(Array.isArray(event.aliases) ? event.aliases : [])
    .concat(Array.isArray(event.transferred_to) ? event.transferred_to : []);
  return uniqueUuids(ids);
}

/** Olay premium ürününe / entitlement'ına mı ait? */
function isPremiumEvent(event) {
  if (isPremiumProduct(str(event.product_id))) return true;
  const ents = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  return ents.includes(PREMIUM.entitlement) || event.entitlement_id === PREMIUM.entitlement;
}

function isCoinPackEvent(event) {
  return isCoinPackProduct(str(event.product_id));
}

/**
 * Webhook gövdesi → karar.
 * @returns {{ action: 'grant'|'revoke'|'grant_coins'|'revoke_coins'|'transfer'|'ignore', reason?, type, eventId, transactionId, productId, userIds, environment, coins? }}
 */
function parseWebhookEvent(body) {
  const event = body && typeof body === 'object' ? body.event : null;
  if (!event || typeof event !== 'object') {
    return {
      action: 'ignore',
      reason: 'no_event',
      type: null,
      eventId: null,
      transactionId: null,
      productId: null,
      userIds: [],
      environment: null,
      coins: 0,
    };
  }
  const type = str(event.type);
  const productId = str(event.product_id);
  const pack = findCoinPack(productId);
  const base = {
    type,
    eventId: str(event.id),
    transactionId: str(event.transaction_id) || str(event.id),
    productId,
    userIds: candidateUserIds(event),
    environment: str(event.environment),
    coins: pack ? pack.coins : 0,
  };

  if (!type) return { action: 'ignore', reason: 'no_type', ...base };

  if (type === TRANSFER_EVENT_TYPE) {
    const to = uniqueUuids(Array.isArray(event.transferred_to) ? event.transferred_to : []);
    if (to.length === 0) return { action: 'ignore', reason: 'no_app_user_id', ...base, userIds: [] };
    return { action: 'transfer', ...base, userIds: to };
  }

  const isGrant = GRANT_EVENT_TYPES.has(type);
  const isRevoke = REVOKE_EVENT_TYPES.has(type);
  if (!isGrant && !isRevoke) return { action: 'ignore', reason: 'unhandled_type', ...base };
  if (base.userIds.length === 0) return { action: 'ignore', reason: 'no_app_user_id', ...base };

  if (isCoinPackEvent(event)) {
    return { action: isGrant ? 'grant_coins' : 'revoke_coins', ...base };
  }
  if (isPremiumEvent(event)) {
    return { action: isGrant ? 'grant' : 'revoke', ...base };
  }
  return { action: 'ignore', reason: 'unknown_product', ...base };
}

/**
 * GET /v1/subscribers/{id} cevabı → premium aktif mi?
 * entitlements.premium (expires_date null veya gelecekte) ya da non_subscriptions[dashink_premium] dolu.
 * @returns {{ active: boolean, transactionId: string|null, environment: string|null }}
 */
function premiumFromSubscriber(apiResponse, now = new Date()) {
  const sub = apiResponse && apiResponse.subscriber;
  const none = { active: false, transactionId: null, environment: null };
  if (!sub || typeof sub !== 'object') return none;

  let active = false;
  const ent = sub.entitlements && sub.entitlements[PREMIUM.entitlement];
  if (ent && typeof ent === 'object') {
    const exp = ent.expires_date ? Date.parse(ent.expires_date) : null;
    active = exp === null || (Number.isFinite(exp) && exp > now.getTime());
  }

  let purchase = null;
  const nonSubs = sub.non_subscriptions && typeof sub.non_subscriptions === 'object' ? sub.non_subscriptions : {};
  for (const [productId, list] of Object.entries(nonSubs)) {
    if (!isPremiumProduct(productId) || !Array.isArray(list) || list.length === 0) continue;
    purchase = list.find((p) => p && typeof p === 'object') || null;
    if (purchase) {
      active = true;
      break;
    }
  }
  return {
    active,
    transactionId: purchase ? str(purchase.store_transaction_id) || str(purchase.id) : null,
    environment: purchase ? (purchase.is_sandbox ? 'SANDBOX' : 'PRODUCTION') : null,
  };
}

/**
 * Subscriber non_subscriptions içinden henüz işlenebilecek coin pack satın alımları.
 * @returns {Array<{ productId: string, coins: number, transactionId: string, environment: string|null }>}
 */
function coinPacksFromSubscriber(apiResponse) {
  const sub = apiResponse && apiResponse.subscriber;
  if (!sub || typeof sub !== 'object') return [];
  const nonSubs = sub.non_subscriptions && typeof sub.non_subscriptions === 'object' ? sub.non_subscriptions : {};
  const out = [];
  for (const [productId, list] of Object.entries(nonSubs)) {
    const pack = findCoinPack(productId);
    if (!pack || !Array.isArray(list)) continue;
    for (const purchase of list) {
      if (!purchase || typeof purchase !== 'object') continue;
      const transactionId = str(purchase.store_transaction_id) || str(purchase.id);
      if (!transactionId) continue;
      out.push({
        productId: pack.product_id,
        coins: pack.coins,
        transactionId,
        environment: purchase.is_sandbox ? 'SANDBOX' : 'PRODUCTION',
      });
    }
  }
  return out;
}

module.exports = {
  GRANT_EVENT_TYPES,
  REVOKE_EVENT_TYPES,
  isUuid,
  candidateUserIds,
  isPremiumEvent,
  isCoinPackEvent,
  parseWebhookEvent,
  premiumFromSubscriber,
  coinPacksFromSubscriber,
};
