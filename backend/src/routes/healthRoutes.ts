import { Router } from 'express';
import {
  getHealthPersons,
  createHealthPerson,
  deleteHealthPerson,
  getHealthRecords,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getSingleHealthRecord,
} from '../controllers/healthController';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth';
import { Response, NextFunction } from 'express';

const router = Router();

router.use(requireAuth);

// Access Restriction: AD or users with /health permission
router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const perms = (req.user as any)?.pagePermissions || [];
  const hasAccess = req.user?.role === 'AD' || perms.includes('*') || perms.includes('/health');
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Access Denied: You do not have permission to access Health & Medical Vault.',
    });
  }
  next();
});

// Persons / Family Profiles
router.get('/persons', getHealthPersons);
router.post('/persons', createHealthPerson);
router.delete('/persons/:id', deleteHealthPerson);

// Medical Records (Test Reports & Doctor Consultations)
router.get('/records/:personId', getHealthRecords);
router.get('/record/:id', getSingleHealthRecord);
router.post('/records', createHealthRecord);
router.patch('/records/:id', updateHealthRecord);
router.delete('/records/:id', deleteHealthRecord);

export default router;
