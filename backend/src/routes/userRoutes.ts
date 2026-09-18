import { Router } from 'express';
import {
  getAllUsers,
  getPartnerStatus,
  createUser,
  updateUserPermissions,
  updateUserRole,
  deleteUser,
} from '../controllers/userController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getAllUsers);
router.post('/', createUser);
router.patch('/:id/permissions', updateUserPermissions);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);
router.get('/partner-status', getPartnerStatus);

export default router;
