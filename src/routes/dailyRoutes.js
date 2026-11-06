const express = require('express');
const dailyController = require('../controllers/dailyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/', requireAuth, dailyController.get);

module.exports = router;
