const router = require('express').Router();
const ctrl = require('../controllers/favoriteController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, ctrl.addFavorite);
router.delete('/:brush_id', requireAuth, ctrl.removeFavorite);
router.get('/mine', requireAuth, ctrl.myFavorites);

module.exports = router;
