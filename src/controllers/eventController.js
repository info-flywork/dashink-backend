const eventService = require('../services/eventService');
const { success } = require('../lib/response');
const { requireString } = require('../lib/validate');

async function share(req, res) {
  const body = req.body || {};
  const clientEventId = requireString(body.client_event_id, 'client_event_id', { max: 64 });
  return success(res, await eventService.recordShare(req.userId, clientEventId));
}

module.exports = { share };
