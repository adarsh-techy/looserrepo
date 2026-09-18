import { Router } from 'express';
import {
  getPaymentRecords,
  getPaymentMonthsSummary,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
} from '../controllers/paymentController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getPaymentRecords);
router.get('/summary/months', getPaymentMonthsSummary);
router.post('/', createPaymentRecord);
router.put('/:id', updatePaymentRecord);
router.delete('/:id', deletePaymentRecord);

export default router;
