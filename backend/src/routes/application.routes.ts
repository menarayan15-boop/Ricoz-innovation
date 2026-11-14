import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  createApplication,
  assignAttorney,
  recordAttorneyReview,
  requestMissingEvidence,
  saveDraft,
  updateApplication,
  updateApplicationStatus,
  getChecklist,
  toggleChecklistItem,
  addCustomChecklistItem,
} from '../controllers/application.controller.js';
import {
  uploadDocuments,
  getApplicationDocuments,
} from '../controllers/document.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { documentUpload } from '../middleware/upload.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { validateApplicationAccess } from '../middleware/ownership.middleware.js';

const router = Router();

// Base application list (dynamically scoped by role, supports search, filter & pagination)
router.get('/', authenticateUser, getApplications);

// Create new application (restricted to applicant, employer, admin)
router.post(
  '/',
  authenticateUser,
  requireRoles('applicant', 'employer', 'admin'),
  createApplication
);

// Get application by ID (strict ownership / case-assignment verification)
router.get('/:id', authenticateUser, validateApplicationAccess, getApplicationById);

// Update application (owner or admin only)
router.put('/:id', authenticateUser, validateApplicationAccess, updateApplication);
router.patch('/:id', authenticateUser, validateApplicationAccess, updateApplication);

// Save draft progress (dedicated auto-save endpoints)
router.post('/:id/save-draft', authenticateUser, validateApplicationAccess, saveDraft);
router.patch('/:id/draft', authenticateUser, validateApplicationAccess, saveDraft);

// Update preparation status with audit history
router.patch('/:id/status', authenticateUser, validateApplicationAccess, updateApplicationStatus);

// Statutory checklist inspection & management
router.get('/:id/checklist', authenticateUser, validateApplicationAccess, getChecklist);
router.patch(
  '/:id/checklist/:itemId',
  authenticateUser,
  validateApplicationAccess,
  toggleChecklistItem
);
router.post(
  '/:id/checklist/custom',
  authenticateUser,
  validateApplicationAccess,
  addCustomChecklistItem
);

// Assign attorney (owner or admin only)
router.post(
  '/:id/assign-attorney',
  authenticateUser,
  validateApplicationAccess,
  assignAttorney
);

// Attorney casework review decision
router.post(
  '/:id/review',
  authenticateUser,
  requireRoles('attorney', 'admin'),
  validateApplicationAccess,
  recordAttorneyReview
);

// Attorney missing evidence request
router.post(
  '/:id/request-evidence',
  authenticateUser,
  requireRoles('attorney', 'admin'),
  validateApplicationAccess,
  requestMissingEvidence
);

// Application Document endpoints (RESTful hierarchy)
router.post(
  '/:id/documents',
  authenticateUser,
  validateApplicationAccess,
  documentUpload.array('files', 5),
  uploadDocuments
);
router.get(
  '/:id/documents',
  authenticateUser,
  validateApplicationAccess,
  getApplicationDocuments
);

export default router;
