// Mağaza kataloğu (sözleşmeyle birebir, SIRA ÖNEMLİ). Ad/açıklama istemcide id ile yerelleştirilir.
// Reklam / reklam kaldırma ürünü yoktur. Tek gerçek para ürünü: dashink_premium (RevenueCat, non-consumable).

const CATEGORIES = Object.freeze(['ball', 'ink', 'theme']);
const UNLOCKS = Object.freeze(['default', 'coins', 'task', 'premium']);

const ITEMS = Object.freeze(
  [
    // Toplar
    { id: 'ball_klasik', category: 'ball', price: 0, unlock: 'default' },
    { id: 'ball_karpuz', category: 'ball', price: 200, unlock: 'coins' },
    { id: 'ball_gezegen', category: 'ball', price: 500, unlock: 'coins' },
    { id: 'ball_goz', category: 'ball', price: 800, unlock: 'coins' },
    { id: 'ball_disko', category: 'ball', price: 0, unlock: 'task', task_id: 'ach_score_500' },
    { id: 'ball_yildiz', category: 'ball', price: 0, unlock: 'premium' },
    // Mürekkep
    { id: 'ink_lacivert', category: 'ink', price: 0, unlock: 'default', color: '#1D2550' },
    { id: 'ink_kirmizi', category: 'ink', price: 150, unlock: 'coins', color: '#F45D35' },
    { id: 'ink_nane', category: 'ink', price: 150, unlock: 'coins', color: '#2BBF98' },
    { id: 'ink_mor', category: 'ink', price: 300, unlock: 'coins', color: '#7B4FD6' },
    { id: 'ink_altin', category: 'ink', price: 0, unlock: 'premium', color: '#F6B830' },
    // Temalar
    { id: 'theme_kagit', category: 'theme', price: 0, unlock: 'default', color: '#F7F0E1' },
    { id: 'theme_nane', category: 'theme', price: 400, unlock: 'coins', color: '#E3F4EC' },
    { id: 'theme_gunbatimi', category: 'theme', price: 400, unlock: 'coins', color: '#FBE3D6' },
    { id: 'theme_gece', category: 'theme', price: 0, unlock: 'premium', color: '#2B3260' },
  ].map((i) => Object.freeze(i)),
);

const PREMIUM = Object.freeze({ product_id: 'dashink_premium', entitlement: 'premium', bonus_coins: 1000 });

function getCatalog() {
  return { items: ITEMS.map((i) => ({ ...i })), premium: { ...PREMIUM } };
}

function findItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

module.exports = { CATEGORIES, UNLOCKS, ITEMS, PREMIUM, getCatalog, findItem };
