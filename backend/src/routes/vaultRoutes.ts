import { Router } from 'express';
import {
  getVaultItems,
  createVaultItem,
  revealVaultPassword,
  updateVaultItem,
  deleteVaultItem,
} from '../controllers/vaultController';
import { requireAuth, authRateLimiter } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getVaultItems);
router.post('/', createVaultItem);
// Direct reveal with JWT auth (no secondary reauth prompt required)
router.post('/:id/reveal', authRateLimiter, revealVaultPassword);
router.put('/:id', updateVaultItem);
router.delete('/:id', deleteVaultItem);

export default router;
