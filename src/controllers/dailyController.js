const dailyService = require('../services/dailyService');
const { success } = require('../lib/response');

async function get(req, res) {
  return success(res, await dailyService.getDaily(req.userId));
}

module.exports = { get };
