// backend/src/routes/evidence.routes.ts
// Express router for Phase 7 Evidence Intelligence, Discrepancies, Gaps & Statutory Criteria

import { Router } from 'express';
import {
  runEvidenceAnalysis,
  getEvidenceFindings,
  reviewEvidenceFinding,
  getEvidenceGaps,
  resolveEvidenceGap,
  getEvidenceMappings,
  updateEvidenceMapping,
  getEvidenceAnalyses,
  getEvidenceReport,
  getEvidenceMatrix,
} from '../controllers/evidence.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// 1. Evidence Analysis Trigger & History
router.post('/applications/:id/evidence/analyze', runEvidenceAnalysis);
router.get('/applications/:id/evidence/analyses', getEvidenceAnalyses);

// 2. Discrepancy Findings & Human Review
router.get('/applications/:id/evidence/findings', getEvidenceFindings);
router.patch('/evidence/findings/:id/review', reviewEvidenceFinding);
router.get('/applications/:id/evidence/matrix', getEvidenceMatrix);

// 3. Evidence Gap Analysis
router.get('/applications/:id/evidence/gaps', getEvidenceGaps);
router.patch('/evidence/gaps/:id', resolveEvidenceGap);

// 4. Statutory Visa Criteria Mapping
router.get('/applications/:id/evidence/mappings', getEvidenceMappings);
router.patch('/evidence/mappings/:id', updateEvidenceMapping);

// 5. Evidence Dossier Summary Report
router.get('/applications/:id/evidence/report', getEvidenceReport);

export default router;

