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

// Access Restriction: Exclusively for Adarsh (AD) and family, not for NS
router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'AD') {
    return res.status(403).json({
      error: 'Access Denied: Health & Medical Vault is strictly private to Adarsh and family.',
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
