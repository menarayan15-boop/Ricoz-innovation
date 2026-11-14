// backend/src/models/document.model.ts
// MongoDB Mongoose Document Model & Audit Activity Trail for Phase 5

import mongoose, { Document as MongooseDoc, Schema, Model, Types } from 'mongoose';
import { VisaCategory } from '../types/index.js';

export type DocumentReviewStatus =
  | 'uploaded'
  | 'pending_review'
  | 'verified'
  | 'correction_requested'
  | 'rejected'
  // Backward compatibility with Phase 3
  | 'pending'
  | 'needs_reupload';

export type OCRProcessingStatus =
  | 'not_applicable'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'needs_review';

export interface IDocumentMetadata {
  pageCount?: number;
  dimensions?: { width: number; height: number };
  ocrStatus?: OCRProcessingStatus;
  extractedText?: string;
  extractedMetadata?: Record<string, unknown>;
  fileEncoding?: string;
}

export interface IDocumentRecord extends MongooseDoc {
  documentId: string; // Public UUID identifier
  applicationId: Types.ObjectId;
  ownerId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  title: string;
  originalFilename: string;
  storedFilename?: string;
  storageKey: string;
  storageProvider: 'local' | 's3' | 'r2';
  storagePath: string;
  mimeType: string;
  fileSize: number;
  category: string; // Primary category ID (e.g. h1b_lca, eb2_perm, other)
  suggestedCategory?: string;
  suggestedReason?: string;
  confidenceScore?: number;
  visaCategory?: VisaCategory;
  checklistItemId?: string;
  reviewStatus: DocumentReviewStatus;
  reviewNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  versionNumber: number;
  isCurrentVersion: boolean;
  parentDocumentId?: Types.ObjectId;
  versionNotes?: string;
  checksum: string; // SHA-256
  metadata?: IDocumentMetadata;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocumentRecord>(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application ID is required'],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'UploadedBy User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    storedFilename: {
      type: String,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      unique: true,
      index: true,
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'r2'],
      default: 'local',
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File cannot be empty'],
      max: [52428800, 'File size cannot exceed 50MB'],
    },
    category: {
      type: String,
      required: true,
      default: 'other',
      index: true,
    },
    suggestedCategory: {
      type: String,
      default: 'other',
    },
    suggestedReason: {
      type: String,
    },
    confidenceScore: {
      type: Number,
      default: 0.5,
    },
    visaCategory: {
      type: String,
      enum: ['H-1B', 'O-1', 'EB-2', 'EB-2-NIW'],
      index: true,
    },
    checklistItemId: {
      type: String,
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: [
        'uploaded',
        'pending_review',
        'verified',
        'correction_requested',
        'rejected',
        'pending',
        'needs_reupload',
      ],
      default: 'pending_review',
      index: true,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review notes cannot exceed 2000 characters'],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    versionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    isCurrentVersion: {
      type: Boolean,
      default: true,
      index: true,
    },
    parentDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentRecord',
      index: true,
    },
    versionNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Version notes cannot exceed 500 characters'],
    },
    checksum: {
      type: String,
      required: [true, 'SHA-256 Checksum is required'],
      index: true,
    },
    metadata: {
      pageCount: { type: Number },
      dimensions: {
        width: { type: Number },
        height: { type: Number },
      },
      ocrStatus: {
        type: String,
        enum: [
          'not_applicable',
          'queued',
          'processing',
          'completed',
          'failed',
          'needs_review',
        ],
        default: 'not_applicable',
      },
      extractedText: { type: String, select: false }, // Exclude large text from default queries
      extractedMetadata: { type: Schema.Types.Mixed },
      fileEncoding: { type: String },
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for enterprise queries & zero-trust filtering
documentSchema.index({ applicationId: 1, isCurrentVersion: 1, deletedAt: 1 });
documentSchema.index({ ownerId: 1, deletedAt: 1 });
documentSchema.index({ visaCategory: 1, category: 1 });
documentSchema.index({ parentDocumentId: 1, versionNumber: -1 });

export const DocumentModel: Model<IDocumentRecord> =
  mongoose.models.DocumentRecord ||
  mongoose.model<IDocumentRecord>('DocumentRecord', documentSchema);

// =========================================================================
// DOCUMENT ACTIVITY AUDIT MODEL
// =========================================================================

export type DocumentAuditEvent =
  | 'upload'
  | 'download'
  | 'preview'
  | 'category_change'
  | 'version_upload'
  | 'review_updated'
  | 'correction_requested'
  | 'soft_deleted'
  | 'restored';

export interface IDocumentActivity extends MongooseDoc {
  documentId: Types.ObjectId;
  applicationId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: string;
  eventType: DocumentAuditEvent;
  timestamp: Date;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

const documentActivitySchema = new Schema<IDocumentActivity>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentRecord',
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        'upload',
        'download',
        'preview',
        'category_change',
        'version_upload',
        'review_updated',
        'correction_requested',
        'soft_deleted',
        'restored',
      ],
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: false,
  }
);

documentActivitySchema.index({ documentId: 1, timestamp: -1 });
documentActivitySchema.index({ applicationId: 1, timestamp: -1 });

export const DocumentActivity: Model<IDocumentActivity> =
  mongoose.models.DocumentActivity ||
  mongoose.model<IDocumentActivity>('DocumentActivity', documentActivitySchema);
