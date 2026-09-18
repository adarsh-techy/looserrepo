import { Router } from 'express';
import {
  getTrashItems,
  getTrashItemById,
  restoreTrashItem,
  deleteTrashItemPermanently,
  updateTrashItemReason,
  emptyTrash,
} from '../controllers/trashController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getTrashItems);
router.delete('/', emptyTrash);
router.get('/:id', getTrashItemById);
router.patch('/:id/reason', updateTrashItemReason);
router.post('/:id/restore', restoreTrashItem);
router.delete('/:id', deleteTrashItemPermanently);

export default router;
