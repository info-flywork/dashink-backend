const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../controllers/clipController');

const router = Router();

// Ham MP4 gövdesi (Content-Type: video/mp4). Auth zorunlu.
router.post('/', requireAuth, upload);

module.exports = router;
