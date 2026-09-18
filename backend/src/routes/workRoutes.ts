import { Router } from 'express';
import {
  getWorks,
  getWorkById,
  createWork,
  updateWork,
  deleteWork,
} from '../controllers/workController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getWorks);
router.get('/:id', getWorkById);
router.post('/', createWork);
router.put('/:id', updateWork);
router.delete('/:id', deleteWork);

export default router;
