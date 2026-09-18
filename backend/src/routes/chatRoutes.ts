import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  getChatPartner,
} from '../controllers/chatController';

const router = Router();

router.use(requireAuth);

router.get('/partner', getChatPartner);
router.get('/messages', getMessages);
router.post('/messages', sendMessage);
router.patch('/read', markMessagesAsRead);
router.get('/unread-count', getUnreadCount);

export default router;
