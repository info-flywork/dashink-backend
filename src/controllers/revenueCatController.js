// RevenueCat webhook: premium / coin pack ver veya iade ile geri al.
const crypto = require('crypto');
const env = require('../config/env');
const { ApiError } = require('../lib/apiError');
const { success } = require('../lib/response');
const { parseWebhookEvent } = require('../lib/revenueCat');
const purchaseService = require('../services/purchaseService');
const logger = require('../logger');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** RevenueCat panelindeki "Authorization header value" birebir gelir; "Bearer <değer>" biçimi de kabul edilir. */
function isAuthorized(header) {
  const expected = env.revenueCatWebhookAuth;
  if (!expected || !header) return false;
  return safeEqual(header, expected) || safeEqual(header, `Bearer ${expected}`);
}

async function handleWebhook(req, res) {
  if (!isAuthorized(req.get('authorization'))) {
    if (!env.revenueCatWebhookAuth) logger.error('revenuecat.webhook_auth_not_configured');
    throw ApiError.unauthorized('bad webhook auth');
  }

  const decision = parseWebhookEvent(req.body);
  const logMeta = {
    type: decision.type,
    event_id: decision.eventId,
    transaction_id: decision.transactionId,
    product_id: decision.productId,
    environment: decision.environment,
    coins: decision.coins || 0,
  };

  if (decision.action === 'ignore') {
    logger.info('revenuecat.webhook_ignored', { ...logMeta, reason: decision.reason });
    return success(res, { handled: false, reason: decision.reason });
  }

  const userId = await purchaseService.resolveUserId(decision.userIds);
  if (!userId) {
    // 200 (RevenueCat tekrar denemesin); kullanıcı /purchases/sync ile de yakalanır.
    logger.warn('revenuecat.webhook_unknown_user', { ...logMeta, user_ids: decision.userIds });
    return success(res, { handled: false, reason: 'unknown_user' });
  }

  if (decision.action === 'grant') {
    const r = await purchaseService.grantPremium(userId, {
      transactionId: decision.transactionId,
      source: 'webhook',
      environment: decision.environment,
      raw: req.body.event,
    });
    logger.info('revenuecat.webhook_grant', { ...logMeta, user_id: userId, ...r });
    return success(res, { handled: true, action: 'grant', granted: r.granted, bonus: r.bonus });
  }

  if (decision.action === 'grant_coins') {
    const r = await purchaseService.grantCoinPack(userId, {
      productId: decision.productId,
      coins: decision.coins,
      transactionId: decision.transactionId,
      source: 'webhook',
      environment: decision.environment,
      raw: req.body.event,
    });
    logger.info('revenuecat.webhook_grant_coins', { ...logMeta, user_id: userId, ...r });
    return success(res, {
      handled: true,
      action: 'grant_coins',
      granted: r.granted,
      coins: r.coins,
      duplicate: r.duplicate,
    });
  }

  if (decision.action === 'transfer') {
    const progress = await purchaseService.syncFromRevenueCat(userId);
    logger.info('revenuecat.webhook_transfer', { ...logMeta, user_id: userId, premium: progress.premium });
    return success(res, { handled: true, action: 'transfer', premium: progress.premium });
  }

  if (decision.action === 'revoke_coins') {
    const r = await purchaseService.revokeCoinPack(userId, {
      productId: decision.productId,
      transactionId: decision.transactionId,
      environment: decision.environment,
      raw: req.body.event,
    });
    logger.info('revenuecat.webhook_revoke_coins', { ...logMeta, user_id: userId, ...r });
    return success(res, { handled: true, action: 'revoke_coins', revoked: r.revoked, coins: r.coins });
  }

  const r = await purchaseService.revokePremium(userId, { raw: req.body.event });
  logger.info('revenuecat.webhook_revoke', { ...logMeta, user_id: userId, ...r });
  return success(res, { handled: true, action: 'revoke', revoked: r.revoked });
}

module.exports = { handleWebhook, isAuthorized };
