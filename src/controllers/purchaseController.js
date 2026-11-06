const purchaseService = require('../services/purchaseService');
const { success } = require('../lib/response');

async function sync(req, res) {
  return success(res, await purchaseService.syncFromRevenueCat(req.userId));
}

module.exports = { sync };
