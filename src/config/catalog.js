// Mağaza kataloğu (sözleşmeyle birebir, SIRA ÖNEMLİ). Ad/açıklama istemcide id ile yerelleştirilir.
// Gerçek para ürünleri (RevenueCat): dashink_premium (non-consumable) + coin paketleri (consumable).

const CATEGORIES = Object.freeze(['ball', 'ink', 'theme']);
const UNLOCKS = Object.freeze(['default', 'coins', 'task', 'premium']);

// Premium öğeler (ball_yildiz, ink_altin, theme_gece) premium olarak işaretli kalır ama
// 3000 altınla da alınabilir. dashink_premium satın alınmışsa hepsi zaten açıktır.
const PREMIUM_ITEM_PRICE = 3000;

const ITEMS = Object.freeze(
  [
    // Toplar (fiyata göre; görev ve premium sonda)
    { id: 'ball_klasik', category: 'ball', price: 0, unlock: 'default' },
    { id: 'ball_karpuz', category: 'ball', price: 200, unlock: 'coins' },
    { id: 'ball_basket', category: 'ball', price: 250, unlock: 'coins' },
    { id: 'ball_tenis', category: 'ball', price: 300, unlock: 'coins' },
    { id: 'ball_plaj', category: 'ball', price: 400, unlock: 'coins' },
    { id: 'ball_gezegen', category: 'ball', price: 500, unlock: 'coins' },
    { id: 'ball_ay', category: 'ball', price: 600, unlock: 'coins' },
    { id: 'ball_bilardo', category: 'ball', price: 700, unlock: 'coins' },
    { id: 'ball_goz', category: 'ball', price: 800, unlock: 'coins' },
    { id: 'ball_buz', category: 'ball', price: 900, unlock: 'coins' },
    { id: 'ball_lav', category: 'ball', price: 1000, unlock: 'coins' },
    { id: 'ball_gokkusagi', category: 'ball', price: 1500, unlock: 'coins' },
    { id: 'ball_disko', category: 'ball', price: 0, unlock: 'task', task_id: 'ach_score_500' },
    { id: 'ball_yildiz', category: 'ball', price: PREMIUM_ITEM_PRICE, unlock: 'premium' },
    // Mürekkep
    { id: 'ink_lacivert', category: 'ink', price: 0, unlock: 'default', color: '#1D2550' },
    { id: 'ink_kirmizi', category: 'ink', price: 150, unlock: 'coins', color: '#F45D35' },
    { id: 'ink_nane', category: 'ink', price: 150, unlock: 'coins', color: '#2BBF98' },
    { id: 'ink_turuncu', category: 'ink', price: 150, unlock: 'coins', color: '#FF8A1F' },
    { id: 'ink_pembe', category: 'ink', price: 200, unlock: 'coins', color: '#F25C9A' },
    { id: 'ink_mavi', category: 'ink', price: 200, unlock: 'coins', color: '#2F6FEB' },
    { id: 'ink_turkuaz', category: 'ink', price: 200, unlock: 'coins', color: '#17A7B8' },
    { id: 'ink_yesil', category: 'ink', price: 250, unlock: 'coins', color: '#3A9D23' },
    { id: 'ink_mor', category: 'ink', price: 300, unlock: 'coins', color: '#7B4FD6' },
    { id: 'ink_kahve', category: 'ink', price: 300, unlock: 'coins', color: '#7A4A2A' },
    { id: 'ink_bordo', category: 'ink', price: 350, unlock: 'coins', color: '#8E1B3A' },
    { id: 'ink_gumus', category: 'ink', price: 500, unlock: 'coins', color: '#9AA3B5' },
    { id: 'ink_altin', category: 'ink', price: PREMIUM_ITEM_PRICE, unlock: 'premium', color: '#F6B830' },
    // Temalar (orman, uzay, gece koyu)
    { id: 'theme_kagit', category: 'theme', price: 0, unlock: 'default', color: '#F7F0E1' },
    { id: 'theme_nane', category: 'theme', price: 400, unlock: 'coins', color: '#E3F4EC' },
    { id: 'theme_gunbatimi', category: 'theme', price: 400, unlock: 'coins', color: '#FBE3D6' },
    { id: 'theme_lavanta', category: 'theme', price: 400, unlock: 'coins', color: '#ECE4FA' },
    { id: 'theme_gokyuzu', category: 'theme', price: 400, unlock: 'coins', color: '#E1EEFB' },
    { id: 'theme_limon', category: 'theme', price: 450, unlock: 'coins', color: '#FBF5D2' },
    { id: 'theme_seker', category: 'theme', price: 450, unlock: 'coins', color: '#FBE4EE' },
    { id: 'theme_orman', category: 'theme', price: 700, unlock: 'coins', color: '#1F3B2D' },
    { id: 'theme_uzay', category: 'theme', price: 900, unlock: 'coins', color: '#14142B' },
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
