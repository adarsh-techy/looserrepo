import { Router } from 'express';
import {
  getSharedNotes,
  createSharedNote,
  markNoteAsRead,
  deleteSharedNote,
} from '../controllers/sharedNotesController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getSharedNotes);
router.post('/', createSharedNote);
router.patch('/:id/read', markNoteAsRead);
router.delete('/:id', deleteSharedNote);

export default router;
