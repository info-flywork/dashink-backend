const express = require('express');
const playerController = require('../controllers/playerController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/progress', playerController.progress);
router.post('/tutorial-complete', playerController.tutorialComplete);
router.post('/name', playerController.updateName);

module.exports = router;
