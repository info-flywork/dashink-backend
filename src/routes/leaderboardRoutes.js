const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/', requireAuth, leaderboardController.get);

module.exports = router;
