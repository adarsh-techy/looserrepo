import { Router } from 'express';
import {
  getBusinessItems,
  getBusinessItemById,
  createBusinessItem,
  updateBusinessItem,
  deleteBusinessItem,
} from '../controllers/businessController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getBusinessItems);
router.get('/:id', getBusinessItemById);
router.post('/', createBusinessItem);
router.put('/:id', updateBusinessItem);
router.delete('/:id', deleteBusinessItem);

export default router;
