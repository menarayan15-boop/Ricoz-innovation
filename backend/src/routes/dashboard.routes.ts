import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/v1/dashboard/summary - Authenticated real dashboard metrics
router.get('/summary', authenticateUser, getDashboardSummary);

export default router;

