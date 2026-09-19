import { Router } from 'express';
import authRoutes from './authRoutes';
import businessRoutes from './businessRoutes';
import futurePlansRoutes from './futurePlansRoutes';
import vaultRoutes from './vaultRoutes';
import sharedNotesRoutes from './sharedNotesRoutes';
import secretNotesRoutes from './secretNotesRoutes';
import auditLogRoutes from './auditLogRoutes';
import notificationRoutes from './notificationRoutes';
import userRoutes from './userRoutes';
import dayToDayRoutes from './dayToDayRoutes';
import chatRoutes from './chatRoutes';
import workRoutes from './workRoutes';
import paymentRoutes from './paymentRoutes';
import moneyRoutes from './moneyRoutes';
import trashRoutes from './trashRoutes';
import healthRoutes from './healthRoutes';
import documentRoutes from './documentRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/business', businessRoutes);
router.use('/future-plans', futurePlansRoutes);
router.use('/vault', vaultRoutes);
router.use('/shared-notes', sharedNotesRoutes);
router.use('/secret-notes', secretNotesRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/day-to-day', dayToDayRoutes);
router.use('/chat', chatRoutes);
router.use('/works', workRoutes);
router.use('/payments', paymentRoutes);
router.use('/money', moneyRoutes);
router.use('/trash', trashRoutes);
router.use('/health', healthRoutes);
router.use('/documents', documentRoutes);

export default router;

