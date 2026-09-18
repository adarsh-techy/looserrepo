import { Router } from 'express';
import {
  getFuturePlans,
  getFuturePlanById,
  createFuturePlan,
  updateFuturePlan,
  updatePartnerNotes,
  deleteFuturePlan,
} from '../controllers/futurePlansController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getFuturePlans);
router.get('/:id', getFuturePlanById);
router.post('/', createFuturePlan);
router.put('/:id', updateFuturePlan);
router.patch('/:id/partner-notes', updatePartnerNotes);
router.delete('/:id', deleteFuturePlan);

export default router;
