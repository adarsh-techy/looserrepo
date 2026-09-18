import { Router } from 'express';
import {
  getDayToDayNotes,
  createDayToDayNote,
  updateDayToDayNote,
  toggleCompleteDayToDayNote,
  deleteDayToDayNote,
} from '../controllers/dayToDayController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getDayToDayNotes);
router.post('/', createDayToDayNote);
router.put('/:id', updateDayToDayNote);
router.patch('/:id/toggle', toggleCompleteDayToDayNote);
router.delete('/:id', deleteDayToDayNote);

export default router;
