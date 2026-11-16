// backend/src/routes/dossier.routes.ts
// Express Router for Phase 8: Dossier Automation, Case Readiness,
// AI Grounded Summaries, Attorney Review, and PDF Export.

import { Router } from 'express';
import { dossierController } from '../controllers/dossier.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// Application-scoped endpoints (Protected by authenticateUser)
router.post(
  '/applications/:id/dossier/generate',
  authenticateUser,
  (req, res) => dossierController.generateDossier(req, res)
);
router.get(
  '/applications/:id/dossier',
  authenticateUser,
  (req, res) => dossierController.getDossierByApplication(req, res)
);
router.get(
  '/applications/:id/dossier/readiness',
  authenticateUser,
  (req, res) => dossierController.getReadinessScore(req, res)
);

// Dossier-scoped endpoints (Protected by authenticateUser)
router.get(
  '/dossier/:dossierId',
  authenticateUser,
  (req, res) => dossierController.getDossierById(req, res)
);
router.patch(
  '/dossier/:dossierId/summary',
  authenticateUser,
  (req, res) => dossierController.editAiSummary(req, res)
);
router.patch(
  '/dossier/:dossierId/review',
  authenticateUser,
  (req, res) => dossierController.reviewDossier(req, res)
);
router.post(
  '/dossier/:dossierId/finalize',
  authenticateUser,
  (req, res) => dossierController.finalizeDossier(req, res)
);
router.get(
  '/dossier/:dossierId/pdf',
  authenticateUser,
  (req, res) => dossierController.exportDossierPdf(req, res)
);

export default router;
