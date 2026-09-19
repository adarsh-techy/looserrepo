import { Router } from 'express';
import {
  getDocumentItems,
  getDocumentItemById,
  createDocumentItem,
  updateDocumentItem,
  deleteDocumentItem,
} from '../controllers/documentController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getDocumentItems);
router.get('/:id', getDocumentItemById);
router.post('/', createDocumentItem);
router.put('/:id', updateDocumentItem);
router.delete('/:id', deleteDocumentItem);

export default router;
