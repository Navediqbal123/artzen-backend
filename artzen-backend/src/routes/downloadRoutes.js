const router = require('express').Router();
const ctrl = require('../controllers/downloadController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, ctrl.recordDownload);
router.get('/history', requireAuth, ctrl.myDownloadHistory);

module.exports = router;
