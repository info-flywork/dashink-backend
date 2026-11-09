// Öğe sahipliği / kuşanma / satın alma kuralları (saf, DB'siz).
// Sahiplik türetilir: varsayılanlar + user_items (coin/görev) + premium ise premium öğeler.
// Böylece premium geri alındığında premium öğeler owned_items'tan kendiliğinden çıkar
// (altınla alınmış premium öğe user_items'ta olduğu için kalır).
const { ITEMS, CATEGORIES, PREMIUM, findItem, findCoinPack } = require('../config/catalog');
const { CODES } = require('./apiError');

const DEFAULT_EQUIPPED = Object.freeze(
  Object.fromEntries(CATEGORIES.map((c) => [c, ITEMS.find((i) => i.category === c && i.unlock === 'default').id])),
);
const DEFAULT_ITEM_IDS = Object.freeze(ITEMS.filter((i) => i.unlock === 'default').map((i) => i.id));
const PREMIUM_ITEM_IDS = Object.freeze(ITEMS.filter((i) => i.unlock === 'premium').map((i) => i.id));

/** Katalog sırasında sahip olunan öğe id'leri. */
function ownedItemIds(userItemIds, premium) {
  const set = new Set(userItemIds || []);
  return ITEMS.filter((i) => {
    if (i.unlock === 'default') return true;
    if (i.unlock === 'premium') return Boolean(premium) || set.has(i.id);
    return set.has(i.id);
  }).map((i) => i.id);
}

/** Kuşanılı öğe sahip olunmuyorsa (ör. premium iadesi) kategorinin varsayılanına döner. */
function resolveEquipped(equipped, ownedIds) {
  const owned = new Set(ownedIds);
  const out = {};
  for (const c of CATEGORIES) {
    const id = equipped ? equipped[c] : null;
    const item = id ? findItem(id) : null;
    out[c] = item && item.category === c && owned.has(id) ? id : DEFAULT_EQUIPPED[c];
  }
  return out;
}

/** Altınla satılan öğe mi (coins veya fiyatı olan premium öğe)? */
function isCoinBuyable(item) {
  return item.unlock === 'coins' || (item.unlock === 'premium' && item.price > 0);
}

/**
 * Coin ile satın alma kontrolü. Hata kodu (string) veya null döner.
 * Sıra: item_locked (default/task öğe coin ile alınamaz) → already_owned → insufficient_coins.
 */
function buyCheck(item, ownedIds, coins) {
  if (!isCoinBuyable(item)) return CODES.ITEM_LOCKED;
  if (ownedIds.includes(item.id)) return CODES.ALREADY_OWNED;
  if (Number(coins) < item.price) return CODES.INSUFFICIENT_COINS;
  return null;
}

/** RevenueCat product id → premium ürünü mü? Store öneki/eki (ör. "dashink_premium:base") tolere edilir. */
function isPremiumProduct(productId) {
  if (typeof productId !== 'string' || !productId) return false;
  return [productId, productId.split(':')[0]].includes(PREMIUM.product_id);
}

function isCoinPackProduct(productId) {
  return Boolean(findCoinPack(productId));
}

module.exports = {
  DEFAULT_EQUIPPED,
  DEFAULT_ITEM_IDS,
  PREMIUM_ITEM_IDS,
  ownedItemIds,
  resolveEquipped,
  isCoinBuyable,
  buyCheck,
  isPremiumProduct,
  isCoinPackProduct,
};
