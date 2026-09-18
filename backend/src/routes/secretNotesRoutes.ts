import { Router } from 'express';
import {
  getSecretNotes,
  createSecretNote,
  validateEmergencyStep1,
  validateEmergencyStep2,
  completeEmergencyUnlock,
  denyEmergencyRequest,
  verifyPostDeathProtocol,
  deleteSecretNote,
  getRecoveryQuestion,
  recoverOrResetPassword,
} from '../controllers/secretNotesController';
import { requireAuth, unlockRateLimiter } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getSecretNotes);
router.post('/', createSecretNote);
router.get('/:id/recovery-question', getRecoveryQuestion);
router.post('/:id/recover-password', unlockRateLimiter, recoverOrResetPassword);
router.post('/step1', unlockRateLimiter, validateEmergencyStep1);
router.post('/step2', unlockRateLimiter, validateEmergencyStep2);
router.post('/unlock', unlockRateLimiter, completeEmergencyUnlock);
router.post('/:noteId/deny', denyEmergencyRequest);
router.post('/:noteId/post-death-verify', verifyPostDeathProtocol);
router.delete('/:id', deleteSecretNote);

export default router;
