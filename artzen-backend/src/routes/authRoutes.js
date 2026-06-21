const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);
router.post('/logout', requireAuth, ctrl.logout);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', requireAuth, ctrl.resetPassword);
router.post('/refresh', ctrl.refreshToken);
router.get('/me', requireAuth, ctrl.me);
router.put('/profile', requireAuth, ctrl.updateProfile);
router.post('/profile/avatar', requireAuth, uploadAvatar.single('avatar'), ctrl.uploadAvatar);

module.exports = router;
