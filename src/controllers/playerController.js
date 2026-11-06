const playerService = require('../services/playerService');
const { getProgress } = require('../services/userService');
const { success } = require('../lib/response');

async function progress(req, res) {
  return success(res, await getProgress(req.userId));
}

async function tutorialComplete(req, res) {
  return success(res, await playerService.completeTutorial(req.userId));
}

async function updateName(req, res) {
  const body = req.body || {};
  return success(res, await playerService.updateName(req.userId, body.name));
}

module.exports = { progress, tutorialComplete, updateName };
