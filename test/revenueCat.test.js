const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWebhookEvent, premiumFromSubscriber, candidateUserIds } = require('../src/lib/revenueCat');

const USER = '3f0c1b7e-2a4d-4c55-9a1e-6b7f8c9d0e1f';
const OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function ev(overrides) {
  return {
    api_version: '1.0',
    event: {
      id: 'evt-1',
      type: 'NON_RENEWING_PURCHASE',
      app_user_id: USER,
      original_app_user_id: '$RCAnonymousID:abc',
      aliases: ['$RCAnonymousID:abc', USER],
      product_id: 'dashink_premium',
      entitlement_ids: ['premium'],
      transaction_id: '2000000123',
      environment: 'SANDBOX',
      ...overrides,
    },
  };
}

test('INITIAL_PURCHASE / NON_RENEWING_PURCHASE premium → grant', () => {
  const d = parseWebhookEvent(ev());
  assert.equal(d.action, 'grant');
  assert.equal(d.transactionId, '2000000123');
  assert.deepEqual(d.userIds, [USER]);
  assert.equal(parseWebhookEvent(ev({ type: 'INITIAL_PURCHASE' })).action, 'grant');
});

test('entitlement_ids ile tanınır (product_id farklı olsa da)', () => {
  assert.equal(parseWebhookEvent(ev({ product_id: 'dashink_premium_v2' })).action, 'grant');
  assert.equal(parseWebhookEvent(ev({ product_id: 'other', entitlement_ids: [] })).reason, 'unknown_product');
});

test('coin pack INITIAL_PURCHASE / NON_RENEWING_PURCHASE → grant_coins', () => {
  const d = parseWebhookEvent(ev({ product_id: 'dashink_coins_1200', entitlement_ids: [] }));
  assert.equal(d.action, 'grant_coins');
  assert.equal(d.coins, 1200);
  assert.equal(parseWebhookEvent(ev({ type: 'REFUND', product_id: 'dashink_coins_500', entitlement_ids: [] })).action, 'revoke_coins');
});

test('CANCELLATION / REFUND → revoke', () => {
  assert.equal(parseWebhookEvent(ev({ type: 'REFUND' })).action, 'revoke');
  assert.equal(parseWebhookEvent(ev({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' })).action, 'revoke');
});

test('TRANSFER → transfer (yalnız transferred_to kullanıcıları)', () => {
  const d = parseWebhookEvent({ event: { id: 'e2', type: 'TRANSFER', transferred_from: [USER], transferred_to: [OTHER, '$RCAnonymousID:x'] } });
  assert.equal(d.action, 'transfer');
  assert.deepEqual(d.userIds, [OTHER]);
  assert.equal(parseWebhookEvent({ event: { type: 'TRANSFER', transferred_to: ['$RCAnonymousID:x'] } }).reason, 'no_app_user_id');
});

test('ignore durumları', () => {
  assert.equal(parseWebhookEvent(ev({ type: 'RENEWAL' })).reason, 'unhandled_type');
  assert.equal(parseWebhookEvent(ev({ type: 'TEST' })).reason, 'unhandled_type');
  assert.equal(parseWebhookEvent(ev({ app_user_id: '$RCAnonymousID:x', aliases: [], original_app_user_id: null })).reason, 'no_app_user_id');
  assert.equal(parseWebhookEvent({}).reason, 'no_event');
  assert.equal(parseWebhookEvent(null).action, 'ignore');
  assert.equal(parseWebhookEvent({ event: {} }).reason, 'no_type');
});

test('candidateUserIds: tekilleştirme ve küçük harf', () => {
  assert.deepEqual(candidateUserIds({ app_user_id: USER, aliases: [USER.toUpperCase()], transferred_to: [OTHER] }), [USER, OTHER]);
});

test('premiumFromSubscriber: entitlement aktif / süresi dolmuş / non_subscriptions', () => {
  const now = new Date('2026-11-05T00:00:00Z');
  assert.equal(premiumFromSubscriber({ subscriber: { entitlements: { premium: { expires_date: null } } } }, now).active, true);
  assert.equal(premiumFromSubscriber({ subscriber: { entitlements: { premium: { expires_date: '2026-01-01T00:00:00Z' } } } }, now).active, false);
  assert.equal(premiumFromSubscriber({ subscriber: { entitlements: { premium: { expires_date: '2027-01-01T00:00:00Z' } } } }, now).active, true);
  const r = premiumFromSubscriber({
    subscriber: { entitlements: {}, non_subscriptions: { dashink_premium: [{ id: 'rc1', store_transaction_id: 'st1', is_sandbox: true }] } },
  }, now);
  assert.deepEqual(r, { active: true, transactionId: 'st1', environment: 'SANDBOX' });
  assert.equal(premiumFromSubscriber({ subscriber: { entitlements: {}, non_subscriptions: { other: [{ id: 'x' }] } } }, now).active, false);
  assert.equal(premiumFromSubscriber({}, now).active, false);
  assert.equal(premiumFromSubscriber(null, now).active, false);
});
