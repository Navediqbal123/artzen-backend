const router = require('express').Router();
const ctrl = require('../controllers/brushController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { uploadBrushAssets } = require('../middleware/upload');

const brushFiles = uploadBrushAssets.fields([
  { name: 'preview', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

router.get('/', ctrl.listBrushes);
router.get('/:id', optionalAuth, ctrl.getBrush);
router.post('/', requireAuth, requireAdmin, brushFiles, ctrl.createBrush);
router.put('/:id', requireAuth, requireAdmin, brushFiles, ctrl.updateBrush);
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteBrush);

module.exports = router;
