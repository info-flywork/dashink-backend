const taskService = require('../services/taskService');
const { PERIODS } = require('../config/tasks');
const { ApiError } = require('../lib/apiError');
const { success } = require('../lib/response');

async function list(req, res) {
  const period = req.query.period === undefined || req.query.period === '' ? 'daily' : req.query.period;
  if (!PERIODS.includes(period)) throw ApiError.badRequest('period must be daily, weekly or achievement');
  return success(res, await taskService.listTasks(req.userId, period));
}

async function claim(req, res) {
  return success(res, await taskService.claim(req.userId, String(req.params.id)));
}

module.exports = { list, claim };
