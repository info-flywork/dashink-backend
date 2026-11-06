const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../src/config/catalog');
const items = require('../src/lib/items');

test('katalog sözleşmedeki şekilde ve sırada', () => {
  const c = catalog.getCatalog();
  assert.deepEqual(c.items.map((i) => i.id), [
    'ball_klasik', 'ball_karpuz', 'ball_gezegen', 'ball_goz', 'ball_disko', 'ball_yildiz',
    'ink_lacivert', 'ink_kirmizi', 'ink_nane', 'ink_mor', 'ink_altin',
    'theme_kagit', 'theme_nane', 'theme_gunbatimi', 'theme_gece',
  ]);
  assert.deepEqual(c.items[4], { id: 'ball_disko', category: 'ball', price: 0, unlock: 'task', task_id: 'ach_score_500' });
  assert.deepEqual(c.items[7], { id: 'ink_kirmizi', category: 'ink', price: 150, unlock: 'coins', color: '#F45D35' });
  assert.deepEqual(c.premium, { product_id: 'dashink_premium', entitlement: 'premium', bonus_coins: 1000 });
  assert.ok(c.items.every((i) => catalog.CATEGORIES.includes(i.category) && catalog.UNLOCKS.includes(i.unlock)));
});

test('getCatalog kopya döner', () => {
  catalog.getCatalog().items[1].price = 1;
  assert.equal(catalog.findItem('ball_karpuz').price, 200);
});

test('ownedItemIds: varsayılanlar + user_items + premium', () => {
  assert.deepEqual(items.ownedItemIds([], false), ['ball_klasik', 'ink_lacivert', 'theme_kagit']);
  assert.deepEqual(items.ownedItemIds(['ball_karpuz', 'bilinmeyen'], false), ['ball_klasik', 'ball_karpuz', 'ink_lacivert', 'theme_kagit']);
  const p = items.ownedItemIds([], true);
  assert.ok(['ball_yildiz', 'ink_altin', 'theme_gece'].every((id) => p.includes(id)));
  assert.deepEqual(items.PREMIUM_ITEM_IDS, ['ball_yildiz', 'ink_altin', 'theme_gece']);
});

test('resolveEquipped: sahip olunmayan kuşanılı öğe varsayılana döner', () => {
  const owned = items.ownedItemIds(['ball_karpuz'], false);
  assert.deepEqual(items.resolveEquipped({ ball: 'ball_karpuz', ink: 'ink_altin', theme: 'ball_klasik' }, owned), {
    ball: 'ball_karpuz', ink: 'ink_lacivert', theme: 'theme_kagit',
  });
  assert.deepEqual(items.resolveEquipped(null, owned), items.DEFAULT_EQUIPPED);
});

test('buyCheck: item_locked → already_owned → insufficient_coins', () => {
  const owned = items.ownedItemIds(['ink_kirmizi'], false);
  assert.equal(items.buyCheck(catalog.findItem('ball_klasik'), owned, 9999), 'item_locked');
  assert.equal(items.buyCheck(catalog.findItem('ball_disko'), owned, 9999), 'item_locked');
  assert.equal(items.buyCheck(catalog.findItem('ball_yildiz'), owned, 9999), 'item_locked');
  assert.equal(items.buyCheck(catalog.findItem('ink_kirmizi'), owned, 9999), 'already_owned');
  assert.equal(items.buyCheck(catalog.findItem('ball_karpuz'), owned, 199), 'insufficient_coins');
  assert.equal(items.buyCheck(catalog.findItem('ball_karpuz'), owned, 200), null);
});

test('isPremiumProduct', () => {
  assert.equal(items.isPremiumProduct('dashink_premium'), true);
  assert.equal(items.isPremiumProduct('dashink_premium:base'), true);
  assert.equal(items.isPremiumProduct('other'), false);
  assert.equal(items.isPremiumProduct(null), false);
});
