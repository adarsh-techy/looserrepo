import { Router } from 'express';
import { getWorkspaceTheme, updateWorkspaceTheme } from '../controllers/workspaceController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/theme', getWorkspaceTheme);
router.put('/theme', updateWorkspaceTheme);
router.post('/theme', updateWorkspaceTheme);

export default router;
