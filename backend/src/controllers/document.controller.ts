// backend/src/controllers/document.controller.ts
// Comprehensive Document Management, Classification, Versioning & Review Controller

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  DocumentModel,
  DocumentActivity,
  DocumentReviewStatus,
  IDocumentRecord,
} from '../models/document.model.js';
import { Application } from '../models/application.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { storageService } from '../services/storage.service.js';
import {
  validateFileSignature,
  calculateChecksum,
} from '../utils/file-signature.js';
import {
  suggestCategoryFromFilename,
  VISA_CATEGORIES_REGISTRY,
} from '../utils/classification.js';
import { logger } from '../utils/logger.js';
import { VisaCategory } from '../types/index.js';

// Helper to record audit events safely
async function logDocumentActivity(params: {
  documentId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  eventType:
    | 'upload'
    | 'download'
    | 'preview'
    | 'category_change'
    | 'version_upload'
    | 'review_updated'
    | 'correction_requested'
    | 'soft_deleted'
    | 'restored';
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await DocumentActivity.create({
      documentId: params.documentId,
      applicationId: params.applicationId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      eventType: params.eventType,
      details: params.details || {},
      ipAddress: params.ipAddress || 'unknown',
    });
  } catch (err) {
    logger.error('Failed to log document audit activity:', err);
  }
}

// Helper to verify application access for a user
async function verifyApplicationAccess(
  applicationId: string | mongoose.Types.ObjectId,
  user: any
): Promise<{ application: any | null; errorStatus?: number; errorMessage?: string }> {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    return { application: null, errorStatus: 400, errorMessage: 'Invalid application ID format.' };
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    return { application: null, errorStatus: 404, errorMessage: 'Visa application not found.' };
  }

  if (user.role === 'admin') {
    return { application };
  }

  const isOwner = application.applicantId.toString() === user._id.toString();
  const isAssignedAttorney =
    application.assignedAttorneyId &&
    application.assignedAttorneyId.toString() === user._id.toString();
  const isSponsoringEmployer =
    application.employerId && application.employerId.toString() === user._id.toString();

  if (!isOwner && !isAssignedAttorney && !isSponsoringEmployer) {
    return {
      application: null,
      errorStatus: 403,
      errorMessage: 'Forbidden: You do not have permission to access documents for this case.',
    };
  }

  return { application };
}

// =========================================================================
// 1. UPLOAD DOCUMENTS FOR AN APPLICATION
// =========================================================================
export const uploadDocuments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const targetAppId = req.params.id || req.body.applicationId;
    if (!targetAppId) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    const { application, errorStatus, errorMessage } = await verifyApplicationAccess(
      targetAppId,
      user
    );
    if (!application) {
      res.status(errorStatus || 403).json({ success: false, message: errorMessage });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const singleFile = req.file as Express.Multer.File | undefined;
    const uploadedFiles: Express.Multer.File[] = files || (singleFile ? [singleFile] : []);

    if (uploadedFiles.length === 0) {
      res.status(400).json({ success: false, message: 'No files were uploaded.' });
      return;
    }

    const { category, title, checklistItemId, notes } = req.body;
    const createdDocuments: IDocumentRecord[] = [];

    for (const file of uploadedFiles) {
      // 1. Binary Magic Number Signature Validation
      const sigCheck = validateFileSignature(file.buffer);
      if (!sigCheck.valid) {
        res.status(400).json({
          success: false,
          message: `Validation failed for "${file.originalname}": ${sigCheck.error}`,
        });
        return;
      }

      // 2. Compute SHA-256 Checksum
      const checksum = calculateChecksum(file.buffer);

      // 3. Filename-based Category Heuristic Suggestion
      const heuristic = suggestCategoryFromFilename(
        file.originalname,
        application.visaCategory as VisaCategory
      );
      const chosenCategory = category || heuristic.suggestedCategory || 'other';

      // 4. Upload to Secure Storage
      const uploadResult = await storageService.uploadFile(
        file.originalname,
        file.buffer,
        sigCheck.detectedMime || file.mimetype
      );

      // 5. Create Document Record in MongoDB
      const docRecord = await DocumentModel.create({
        documentId: crypto.randomUUID(),
        applicationId: application._id,
        ownerId: application.applicantId,
        uploadedBy: user._id,
        title: title || file.originalname,
        originalFilename: file.originalname,
        storedFilename: uploadResult.storageKey,
        storageKey: uploadResult.storageKey,
        storageProvider: uploadResult.storageProvider,
        storagePath: uploadResult.storagePath,
        mimeType: sigCheck.detectedMime || file.mimetype,
        fileSize: file.size,
        category: chosenCategory,
        suggestedCategory: heuristic.suggestedCategory,
        suggestedReason: heuristic.reason,
        confidenceScore: heuristic.confidence,
        visaCategory: application.visaCategory,
        checklistItemId: checklistItemId || undefined,
        reviewStatus: 'pending_review',
        reviewNotes: notes || '',
        versionNumber: 1,
        isCurrentVersion: true,
        checksum,
        metadata: {
          ocrStatus: 'queued',
        },
      });

      // 6. Record Audit Event
      await logDocumentActivity({
        documentId: docRecord._id,
        applicationId: application._id,
        actorId: user._id,
        actorRole: user.role,
        eventType: 'upload',
        details: {
          originalFilename: file.originalname,
          fileSize: file.size,
          category: chosenCategory,
          checksum,
        },
        ipAddress: req.ip,
      });

      // 7. Sync with Application Checklist Item if linked
      if (checklistItemId && Array.isArray(application.checklist)) {
        const itemIndex = application.checklist.findIndex(
          (c: any) => c.id === checklistItemId
        );
        if (itemIndex >= 0) {
          application.checklist[itemIndex].notes = `Exhibit attached: ${file.originalname}`;
          await application.save();
        }
      }

      createdDocuments.push(docRecord);
    }

    res.status(201).json({
      success: true,
      message: `${createdDocuments.length} document(s) uploaded and validated successfully.`,
      documents: createdDocuments,
    });
  } catch (error) {
    logger.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process document upload.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =========================================================================
// 2. GET APPLICATION DOCUMENTS (FILTERING, SEARCH & PAGINATION)
// =========================================================================
export const getApplicationDocuments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const targetAppId = req.params.id || req.params.applicationId;
    const { application, errorStatus, errorMessage } = await verifyApplicationAccess(
      targetAppId,
      user
    );
    if (!application) {
      res.status(errorStatus || 403).json({ success: false, message: errorMessage });
      return;
    }

    const filter: Record<string, unknown> = {
      applicationId: application._id,
      isCurrentVersion: true,
      deletedAt: null,
    };

    // Category filter
    const { category } = req.query;
    if (category && typeof category === 'string' && category !== 'ALL') {
      filter.category = category;
    }

    // Review status filter
    const { status } = req.query;
    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.reviewStatus = status;
    }

    // Search query across title and originalFilename
    const { search } = req.query;
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { originalFilename: searchRegex }];
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [total, documents] = await Promise.all([
      DocumentModel.countDocuments(filter),
      DocumentModel.find(filter)
        .populate('uploadedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      documents,
    });
  } catch (error) {
    logger.error('Failed to retrieve application documents:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve documents.' });
  }
};

// =========================================================================
// 3. GET SINGLE DOCUMENT METADATA
// =========================================================================
export const getDocumentById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid document ID.' });
      return;
    }

    const docRecord = await DocumentModel.findOne({ _id: id, deletedAt: null })
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    // Verify access
    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    res.status(200).json({
      success: true,
      document: docRecord,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve document details.' });
  }
};

// =========================================================================
// 4. DOWNLOAD DOCUMENT SAFELY (ATTACHMENT)
// =========================================================================
export const downloadDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid document ID.' });
      return;
    }

    const docRecord = await DocumentModel.findOne({ _id: id, deletedAt: null });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const streamResult = await storageService.getFileStream(
      docRecord.storageKey,
      docRecord.mimeType
    );

    // Record audit event
    await logDocumentActivity({
      documentId: docRecord._id,
      applicationId: docRecord.applicationId,
      actorId: user._id,
      actorRole: user.role,
      eventType: 'download',
      details: { originalFilename: docRecord.originalFilename },
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', docRecord.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(docRecord.originalFilename)}"`
    );
    if (streamResult.contentLength) {
      res.setHeader('Content-Length', streamResult.contentLength);
    }

    streamResult.stream.pipe(res);
  } catch (error) {
    logger.error('Failed to download document:', error);
    res.status(500).json({ success: false, message: 'Failed to download document.' });
  }
};

// =========================================================================
// 5. PREVIEW DOCUMENT INLINE (AUTHENTICATED STREAM)
// =========================================================================
export const previewDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid document ID.' });
      return;
    }

    const docRecord = await DocumentModel.findOne({ _id: id, deletedAt: null });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const streamResult = await storageService.getFileStream(
      docRecord.storageKey,
      docRecord.mimeType
    );

    // Record audit event
    await logDocumentActivity({
      documentId: docRecord._id,
      applicationId: docRecord.applicationId,
      actorId: user._id,
      actorRole: user.role,
      eventType: 'preview',
      details: { mimeType: docRecord.mimeType },
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', docRecord.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(docRecord.originalFilename)}"`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');

    if (streamResult.contentLength) {
      res.setHeader('Content-Length', streamResult.contentLength);
    }

    streamResult.stream.pipe(res);
  } catch (error) {
    logger.error('Failed to stream preview:', error);
    res.status(500).json({ success: false, message: 'Failed to stream document preview.' });
  }
};

// =========================================================================
// 6. UPDATE DOCUMENT METADATA
// =========================================================================
export const updateDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const { title, category, checklistItemId, notes } = req.body;

    const docRecord = await DocumentModel.findOne({ _id: id, deletedAt: null });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    if (title) docRecord.title = title;
    if (category && category !== docRecord.category) {
      await logDocumentActivity({
        documentId: docRecord._id,
        applicationId: docRecord.applicationId,
        actorId: user._id,
        actorRole: user.role,
        eventType: 'category_change',
        details: { previousCategory: docRecord.category, newCategory: category },
        ipAddress: req.ip,
      });
      docRecord.category = category;
    }
    if (checklistItemId !== undefined) docRecord.checklistItemId = checklistItemId;
    if (notes !== undefined) docRecord.reviewNotes = notes;

    await docRecord.save();

    res.status(200).json({
      success: true,
      message: 'Document metadata updated.',
      document: docRecord,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update document.' });
  }
};

// =========================================================================
// 7. UPLOAD REPLACEMENT VERSION (VERSIONING)
// =========================================================================
export const uploadDocumentVersion = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const { versionNotes } = req.body;

    const prevDoc = await DocumentModel.findOne({ _id: id, deletedAt: null });
    if (!prevDoc) {
      res.status(404).json({ success: false, message: 'Target document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(prevDoc.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No replacement file was uploaded.' });
      return;
    }

    const sigCheck = validateFileSignature(file.buffer);
    if (!sigCheck.valid) {
      res.status(400).json({ success: false, message: sigCheck.error });
      return;
    }

    const checksum = calculateChecksum(file.buffer);
    const uploadResult = await storageService.uploadFile(
      file.originalname,
      file.buffer,
      sigCheck.detectedMime || file.mimetype
    );

    // Mark previous document as not current version
    prevDoc.isCurrentVersion = false;
    await prevDoc.save();

    const parentId = prevDoc.parentDocumentId || prevDoc._id;
    const newVersionNumber = prevDoc.versionNumber + 1;

    // Create new version record
    const newDoc = await DocumentModel.create({
      documentId: crypto.randomUUID(),
      applicationId: prevDoc.applicationId,
      ownerId: prevDoc.ownerId,
      uploadedBy: user._id,
      title: prevDoc.title,
      originalFilename: file.originalname,
      storedFilename: uploadResult.storageKey,
      storageKey: uploadResult.storageKey,
      storageProvider: uploadResult.storageProvider,
      storagePath: uploadResult.storagePath,
      mimeType: sigCheck.detectedMime || file.mimetype,
      fileSize: file.size,
      category: prevDoc.category,
      visaCategory: prevDoc.visaCategory,
      checklistItemId: prevDoc.checklistItemId,
      reviewStatus: 'pending_review',
      versionNumber: newVersionNumber,
      isCurrentVersion: true,
      parentDocumentId: parentId,
      versionNotes: versionNotes || `Updated to revision ${newVersionNumber}`,
      checksum,
      metadata: {
        ocrStatus: 'queued',
      },
    });

    await logDocumentActivity({
      documentId: newDoc._id,
      applicationId: prevDoc.applicationId,
      actorId: user._id,
      actorRole: user.role,
      eventType: 'version_upload',
      details: {
        previousVersion: prevDoc.versionNumber,
        newVersion: newVersionNumber,
        checksum,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Document revision ${newVersionNumber} uploaded successfully.`,
      document: newDoc,
    });
  } catch (error) {
    logger.error('Failed to upload document version:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document version.' });
  }
};

// =========================================================================
// 8. GET DOCUMENT VERSION HISTORY
// =========================================================================
export const getDocumentVersions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(doc.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const parentId = doc.parentDocumentId || doc._id;
    const versions = await DocumentModel.find({
      $or: [{ _id: parentId }, { parentDocumentId: parentId }],
      deletedAt: null,
    })
      .populate('uploadedBy', 'name email role')
      .sort({ versionNumber: -1 });

    res.status(200).json({
      success: true,
      count: versions.length,
      versions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve version history.' });
  }
};

// =========================================================================
// 9. ATTORNEY REVIEW WORKFLOW
// =========================================================================
export const reviewDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    const validStatuses: DocumentReviewStatus[] = [
      'verified',
      'correction_requested',
      'rejected',
      'pending_review',
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid review status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const docRecord = await DocumentModel.findOne({ _id: id, deletedAt: null });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    if (
      user?.role !== 'admin' &&
      (!application.assignedAttorneyId ||
        application.assignedAttorneyId.toString() !== user?._id.toString())
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to review this case.',
      });
      return;
    }

    docRecord.reviewStatus = status;
    docRecord.reviewedBy = user._id;
    docRecord.reviewedAt = new Date();
    if (reviewNotes !== undefined) {
      docRecord.reviewNotes = reviewNotes;
    }
    await docRecord.save();

    // Log activity
    await logDocumentActivity({
      documentId: docRecord._id,
      applicationId: docRecord.applicationId,
      actorId: user._id,
      actorRole: user.role,
      eventType: status === 'correction_requested' ? 'correction_requested' : 'review_updated',
      details: { reviewStatus: status, reviewNotes },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Document status updated to "${status}".`,
      document: docRecord,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record review.' });
  }
};

// =========================================================================
// 10. SOFT DELETE DOCUMENT
// =========================================================================
export const deleteDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;

    const docRecord = await DocumentModel.findOne({ _id: id, deletedAt: null });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const isOwner = docRecord.ownerId.toString() === user._id.toString();
    const isUploader = docRecord.uploadedBy.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isUploader && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this document.',
      });
      return;
    }

    // Soft delete: preserve metadata & audit trail
    docRecord.deletedAt = new Date();
    docRecord.isCurrentVersion = false;
    await docRecord.save();

    await logDocumentActivity({
      documentId: docRecord._id,
      applicationId: docRecord.applicationId,
      actorId: user._id,
      actorRole: user.role,
      eventType: 'soft_deleted',
      details: { originalFilename: docRecord.originalFilename },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Document successfully removed.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete document.' });
  }
};

// =========================================================================
// 11. GET DOCUMENT AUDIT ACTIVITY TIMELINE
// =========================================================================
export const getDocumentActivity = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;

    const docRecord = await DocumentModel.findById(id);
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { application } = await verifyApplicationAccess(docRecord.applicationId, user);
    if (!application) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const activities = await DocumentActivity.find({ documentId: id })
      .populate('actorId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve document activity.' });
  }
};

// =========================================================================
// 12. GET DOCUMENT CATEGORIES & CLASSIFICATION SUGGESTIONS
// =========================================================================
export const getClassificationSuggestions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { filename, visaCategory } = req.query;

    const registry = VISA_CATEGORIES_REGISTRY[visaCategory as string] || VISA_CATEGORIES_REGISTRY['H-1B'];
    let suggestion = null;

    if (filename && typeof filename === 'string') {
      suggestion = suggestCategoryFromFilename(filename, visaCategory as VisaCategory);
    }

    res.status(200).json({
      success: true,
      categories: registry,
      suggestion,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate category suggestions.' });
  }
};

// =========================================================================
// 13. GET DOCUMENT WORKSPACE METRICS
// =========================================================================
export const getDocumentStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    let appQuery: Record<string, unknown> = {};
    if (user.role === 'applicant') {
      appQuery = { applicantId: user._id };
    } else if (user.role === 'attorney') {
      appQuery = { assignedAttorneyId: user._id };
    } else if (user.role === 'employer') {
      appQuery = { employerId: user._id };
    }

    const userApps = await Application.find(appQuery).select('_id');
    const appIds = userApps.map((a) => a._id);

    const docFilter = {
      applicationId: { $in: appIds },
      isCurrentVersion: true,
      deletedAt: null,
    };

    const [totalDocs, pendingReview, verifiedDocs, correctionDocs] = await Promise.all([
      DocumentModel.countDocuments(docFilter),
      DocumentModel.countDocuments({
        ...docFilter,
        reviewStatus: { $in: ['pending_review', 'pending', 'uploaded'] },
      }),
      DocumentModel.countDocuments({ ...docFilter, reviewStatus: 'verified' }),
      DocumentModel.countDocuments({
        ...docFilter,
        reviewStatus: { $in: ['correction_requested', 'needs_reupload', 'rejected'] },
      }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalDocuments: totalDocs,
        pendingReview,
        verifiedDocuments: verifiedDocs,
        correctionsRequested: correctionDocs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compute document statistics.' });
  }
};
