import { Router } from 'express';
import {
  getHealth,
  getDbHealth,
  verifyDbCrud,
  createPersistenceRecord,
  getPersistenceRecord,
  deletePersistenceRecord,
} from '../controllers/health.controller.js';

const router = Router();

router.get('/', getHealth);
router.get('/db', getDbHealth);
router.get('/db/verify-crud', verifyDbCrud);
router.post('/db/persistence-record', createPersistenceRecord);
router.get('/db/persistence-record/:token', getPersistenceRecord);
router.delete('/db/persistence-record/:token', deletePersistenceRecord);

export default router;
