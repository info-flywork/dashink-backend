const express = require('express');
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/', taskController.list);
router.post('/:id/claim', taskController.claim);

module.exports = router;
