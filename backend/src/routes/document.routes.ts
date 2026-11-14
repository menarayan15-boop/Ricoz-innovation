// backend/src/routes/document.routes.ts
// Express Router for Secure Document Management, Previews, Versioning & Reviews

import { Router } from 'express';
import {
  uploadDocuments,
  getApplicationDocuments,
  getDocumentById,
  downloadDocument,
  previewDocument,
  updateDocument,
  uploadDocumentVersion,
  getDocumentVersions,
  reviewDocument,
  deleteDocument,
  getDocumentActivity,
  getClassificationSuggestions,
  getDocumentStats,
} from '../controllers/document.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { documentUpload } from '../middleware/upload.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// 1. Workspace Stats & Category Suggestions
router.get('/stats', authenticateUser, getDocumentStats);
router.get('/suggestions', authenticateUser, getClassificationSuggestions);

// 2. Upload Documents (array of up to 5 files)
router.post(
  '/upload',
  authenticateUser,
  documentUpload.array('files', 5),
  uploadDocuments
);

// 3. Application Document Listing (Backward Compatibility)
router.get(
  '/application/:applicationId',
  authenticateUser,
  getApplicationDocuments
);

// 4. Single Document Operations
router.get('/:id', authenticateUser, getDocumentById);
router.get('/:id/download', authenticateUser, downloadDocument);
router.get('/:id/preview', authenticateUser, previewDocument);
router.patch('/:id', authenticateUser, updateDocument);
router.delete('/:id', authenticateUser, deleteDocument);

// 5. Version History & Replacement
router.post(
  '/:id/versions',
  authenticateUser,
  documentUpload.single('file'),
  uploadDocumentVersion
);
router.get('/:id/versions', authenticateUser, getDocumentVersions);

// 6. Review Workflow (Attorneys & Admins)
router.patch(
  '/:id/review',
  authenticateUser,
  requireRoles('attorney', 'admin'),
  reviewDocument
);

// 7. Audit Activity Timeline
router.get('/:id/activity', authenticateUser, getDocumentActivity);

export default router;
