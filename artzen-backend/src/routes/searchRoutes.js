const router = require('express').Router();
const ctrl = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, ctrl.searchBrushes);

module.exports = router;
