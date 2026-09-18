import { Router } from 'express';
import {
  getAuditLogs,
  logSecurityAlertEvent,
  getPartnerBreachAlerts,
  acknowledgeBreachAlert,
} from '../controllers/auditLogController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getAuditLogs);
router.get('/partner-breach-alerts', getPartnerBreachAlerts);
router.post('/acknowledge-breach-alert', acknowledgeBreachAlert);
router.post('/log-event', logSecurityAlertEvent);

export default router;
