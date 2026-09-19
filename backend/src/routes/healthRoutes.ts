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
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

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
