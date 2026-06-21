const router = require('express').Router();
const ctrl = require('../controllers/collectionController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, ctrl.createCollection);
router.get('/mine', requireAuth, ctrl.myCollections);
router.get('/:id', requireAuth, ctrl.getCollection);
router.put('/:id', requireAuth, ctrl.updateCollection);
router.delete('/:id', requireAuth, ctrl.deleteCollection);
router.post('/:id/brushes', requireAuth, ctrl.addBrushToCollection);
router.delete('/:id/brushes/:brushId', requireAuth, ctrl.removeBrushFromCollection);

module.exports = router;
