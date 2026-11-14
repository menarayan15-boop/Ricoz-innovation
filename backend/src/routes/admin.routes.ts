import { Router } from 'express';
import {
  listAllUsers,
  updateUserRole,
  getSystemStats,
} from '../controllers/admin.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Strict Admin-only access guard on all routes
router.use(authenticateUser, requireAdmin);

router.get('/users', listAllUsers);
router.patch('/users/:userId/role', updateUserRole);
router.get('/stats', getSystemStats);

export default router;

