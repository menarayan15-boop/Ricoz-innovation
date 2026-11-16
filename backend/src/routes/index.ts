import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import applicationRoutes from './application.routes.js';
import adminRoutes from './admin.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import documentRoutes from './document.routes.js';
import aiRoutes from './ai.routes.js';
import evidenceRoutes from './evidence.routes.js';
import dossierRoutes from './dossier.routes.js';

const router = Router();

// Mount API routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/applications', applicationRoutes);
router.use('/documents', documentRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);
router.use('/', evidenceRoutes);
router.use('/', dossierRoutes);

export default router;
