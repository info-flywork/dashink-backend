const express = require('express');
const revenueCatController = require('../controllers/revenueCatController');

const router = express.Router();
router.post('/revenuecat', revenueCatController.handleWebhook);

module.exports = router;
