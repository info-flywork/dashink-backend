// Mağaza kataloğu (sözleşmeyle birebir, SIRA ÖNEMLİ). Ad/açıklama istemcide id ile yerelleştirilir.
// Gerçek para ürünleri (RevenueCat): dashink_premium (non-consumable) + coin paketleri (consumable).

const CATEGORIES = Object.freeze(['ball', 'ink', 'theme']);
const UNLOCKS = Object.freeze(['default', 'coins', 'task', 'premium']);

// Premium öğeler (ball_yildiz, ink_altin, theme_gece) premium olarak işaretli kalır ama
// 3000 altınla da alınabilir. dashink_premium satın alınmışsa hepsi zaten açıktır.
const PREMIUM_ITEM_PRICE = 3000;

const ITEMS = Object.freeze(
  [
    // Toplar
    { id: 'ball_klasik', category: 'ball', price: 0, unlock: 'default' },
    { id: 'ball_karpuz', category: 'ball', price: 200, unlock: 'coins' },
    { id: 'ball_gezegen', category: 'ball', price: 500, unlock: 'coins' },
    { id: 'ball_goz', category: 'ball', price: 800, unlock: 'coins' },
    { id: 'ball_disko', category: 'ball', price: 0, unlock: 'task', task_id: 'ach_score_500' },
    { id: 'ball_yildiz', category: 'ball', price: PREMIUM_ITEM_PRICE, unlock: 'premium' },
    // Mürekkep
    { id: 'ink_lacivert', category: 'ink', price: 0, unlock: 'default', color: '#1D2550' },
    { id: 'ink_kirmizi', category: 'ink', price: 150, unlock: 'coins', color: '#F45D35' },
    { id: 'ink_nane', category: 'ink', price: 150, unlock: 'coins', color: '#2BBF98' },
    { id: 'ink_mor', category: 'ink', price: 300, unlock: 'coins', color: '#7B4FD6' },
    { id: 'ink_altin', category: 'ink', price: PREMIUM_ITEM_PRICE, unlock: 'premium', color: '#F6B830' },
    // Temalar
    { id: 'theme_kagit', category: 'theme', price: 0, unlock: 'default', color: '#F7F0E1' },
    { id: 'theme_nane', category: 'theme', price: 400, unlock: 'coins', color: '#E3F4EC' },
    { id: 'theme_gunbatimi', category: 'theme', price: 400, unlock: 'coins', color: '#FBE3D6' },
    { id: 'theme_gece', category: 'theme', price: PREMIUM_ITEM_PRICE, unlock: 'premium', color: '#2B3260' },
  ].map((i) => Object.freeze(i)),
);

const PREMIUM = Object.freeze({ product_id: 'dashink_premium', entitlement: 'premium', bonus_coins: 1000 });

/** Consumable coin paketleri — product_id App Store / Play / RevenueCat ile birebir aynı olmalı. */
const COIN_PACKS = Object.freeze(
  [
    { product_id: 'dashink_coins_500', coins: 500 },
    { product_id: 'dashink_coins_1200', coins: 1200 },
    { product_id: 'dashink_coins_3000', coins: 3000 },
  ].map((p) => Object.freeze(p)),
);

function getCatalog() {
  return {
    items: ITEMS.map((i) => ({ ...i })),
    premium: { ...PREMIUM },
    coin_packs: COIN_PACKS.map((p) => ({ ...p })),
  };
}

function findItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

function findCoinPack(productId) {
  if (typeof productId !== 'string' || !productId) return null;
  const base = productId.split(':')[0];
  return COIN_PACKS.find((p) => p.product_id === productId || p.product_id === base) || null;
}

module.exports = {
  CATEGORIES,
  UNLOCKS,
  PREMIUM_ITEM_PRICE,
  ITEMS,
  PREMIUM,
  COIN_PACKS,
  getCatalog,
  findItem,
  findCoinPack,
};
