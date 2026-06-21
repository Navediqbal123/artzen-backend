const router = require('express').Router();
const ctrl = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.get('/', ctrl.listCategories);
router.get('/:id', ctrl.getCategory);
router.post('/', requireAuth, requireAdmin, ctrl.createCategory);
router.put('/:id', requireAuth, requireAdmin, ctrl.updateCategory);
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteCategory);

module.exports = router;
