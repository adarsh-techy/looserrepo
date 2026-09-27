import { Router } from 'express';
import {
  register,
  login,
  reauthenticate,
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  ownerCheckIn,
  getProfile,
  updatePreferences,
  changePassword,
  refreshSession,
  logoutSession,
} from '../controllers/authController';
import { requireAuth, authRateLimiter, refreshRateLimiter } from '../middlewares/auth';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refreshRateLimiter, refreshSession);
router.post('/logout', refreshRateLimiter, logoutSession);
router.post('/reauth', requireAuth, authRateLimiter, reauthenticate);
router.post('/change-password', requireAuth, changePassword);
router.post('/2fa/setup', requireAuth, setup2FA);
router.post('/2fa/verify', requireAuth, verifyAndEnable2FA);
router.post('/2fa/disable', requireAuth, disable2FA);
router.post('/checkin', requireAuth, ownerCheckIn);
router.get('/profile', requireAuth, getProfile);
router.patch('/preferences', requireAuth, updatePreferences);

export default router;

