const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();
router.post('/device', authController.device);
router.post('/refresh', authController.refresh);

module.exports = router;
