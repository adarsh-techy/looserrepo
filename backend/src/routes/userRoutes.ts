import { Router } from 'express';
import {
  getAllUsers,
  getPartnerStatus,
  createUser,
  updateUserPermissions,
  updateUserRole,
  deleteUser,
  adminResetUserPassword,
} from '../controllers/userController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/partner-status', getPartnerStatus);
router.get('/', getAllUsers);
router.post('/', createUser);
router.patch('/:id/permissions', updateUserPermissions);
router.patch('/:id/role', updateUserRole);
router.patch('/:id/password', adminResetUserPassword);
router.delete('/:id', deleteUser);

export default router;
