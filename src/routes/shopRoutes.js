const express = require('express');
const shopController = require('../controllers/shopController');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/catalog', optionalAuth, shopController.catalog);
router.post('/buy', requireAuth, shopController.buy);
router.post('/equip', requireAuth, shopController.equip);

module.exports = router;
