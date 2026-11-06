const express = require('express');
const gameController = require('../controllers/gameController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.post('/', requireAuth, gameController.submit);

module.exports = router;
