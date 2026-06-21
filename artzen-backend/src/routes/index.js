const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/brushes', require('./brushRoutes'));
router.use('/favorites', require('./favoriteRoutes'));
router.use('/downloads', require('./downloadRoutes'));
router.use('/collections', require('./collectionRoutes'));
router.use('/search', require('./searchRoutes'));

module.exports = router;
