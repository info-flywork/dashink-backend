const express = require('express');
const eventController = require('../controllers/eventController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.post('/share', requireAuth, eventController.share);

module.exports = router;
