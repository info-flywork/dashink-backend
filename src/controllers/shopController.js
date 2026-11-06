const { getCatalog } = require('../config/catalog');
const shopService = require('../services/shopService');
const { success } = require('../lib/response');
const { requireString } = require('../lib/validate');

function catalog(_req, res) {
  // Katalog nadiren değişir.
  res.set('Cache-Control', 'public, max-age=3600');
  return success(res, getCatalog());
}

async function buy(req, res) {
  const body = req.body || {};
  return success(res, await shopService.buy(req.userId, requireString(body.item_id, 'item_id', { max: 32 })));
}

async function equip(req, res) {
  const body = req.body || {};
  return success(res, await shopService.equip(req.userId, requireString(body.item_id, 'item_id', { max: 32 })));
}

module.exports = { catalog, buy, equip };
