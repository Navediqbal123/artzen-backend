const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/admin');

// Every route below requires a valid logged-in user who also has a row in admin_users
router.use(requireAuth, requireAdmin);

router.get('/dashboard', ctrl.dashboard);

router.get('/users', ctrl.listUsers);
router.post('/users/:id/ban', ctrl.banUser);
router.post('/users/:id/unban', ctrl.unbanUser);
router.delete('/users/:id', requireSuperAdmin, ctrl.deleteUser);

router.get('/brushes', ctrl.listAllBrushes);

router.post('/grant', requireSuperAdmin, ctrl.grantAdmin);
router.delete('/revoke/:id', requireSuperAdmin, ctrl.revokeAdmin);

router.get('/analytics', ctrl.analyticsOverview);

module.exports = router;
