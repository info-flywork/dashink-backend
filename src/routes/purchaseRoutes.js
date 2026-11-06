const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.post('/sync', requireAuth, purchaseController.sync);

module.exports = router;
