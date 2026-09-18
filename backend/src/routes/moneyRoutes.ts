import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  getMoneyRecords,
  getMoneyMonthsSummary,
  createMoneyRecord,
  updateMoneyRecord,
  deleteMoneyRecord,
} from '../controllers/moneyController';

const router = Router();

router.use(requireAuth);

router.get('/summary/months', getMoneyMonthsSummary);
router.get('/', getMoneyRecords);
router.post('/', createMoneyRecord);
router.put('/:id', updateMoneyRecord);
router.delete('/:id', deleteMoneyRecord);

export default router;
