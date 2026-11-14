// backend/src/models/evidence-intelligence.model.ts
// MongoDB Schemas for Phase 7 Evidence Intelligence: Analysis Runs, Discrepancy Findings,
// Statutory Visa Criteria Mapping, and Evidence Gap Analysis.

import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

// -----------------------------------------------------------------------------
// 1. EVIDENCE ANALYSIS RUN SCHEMA
// -----------------------------------------------------------------------------
export interface IEvidenceAnalysis extends MongooseDoc {
  analysisId: string;
  applicationId: Types.ObjectId;
  runBy: Types.ObjectId;
  status: 'queued' | 'running' | 'completed' | 'failed';
  documentVersions: Array<{
    documentId: Types.ObjectId;
    checksum: string;
    filename: string;
  }>;
  modelVersion: string;
  rulesVersion: string;
  summaryMetrics: {
    documentsAnalyzed: number;
    findingsCount: number;
    findingsBySeverity: {
      informational: number;
      low: number;
      medium: number;
      high: number;
    };
    gapsCount: number;
    criteriaSupportedCount: number;
    criteriaTotalCount: number;
    coveragePercentage: number;
  };
  durationMs: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceAnalysisSchema = new Schema<IEvidenceAnalysis>(
  {
    analysisId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    runBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    documentVersions: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'DocumentRecord' },
        checksum: { type: String },
        filename: { type: String },
      },
    ],
    modelVersion: {
      type: String,
      default: 'gpt-4o-mini',
    },
    rulesVersion: {
      type: String,
      default: '7.0-deterministic-ai-hybrid',
    },
    summaryMetrics: {
      documentsAnalyzed: { type: Number, default: 0 },
      findingsCount: { type: Number, default: 0 },
      findingsBySeverity: {
        informational: { type: Number, default: 0 },
        low: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
      },
      gapsCount: { type: Number, default: 0 },
      criteriaSupportedCount: { type: Number, default: 0 },
      criteriaTotalCount: { type: Number, default: 0 },
      coveragePercentage: { type: Number, default: 0 },
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// -----------------------------------------------------------------------------
// 2. EVIDENCE FINDING (DISCREPANCY) SCHEMA
// -----------------------------------------------------------------------------
export type FindingCategory =
  | 'identity_discrepancy'
  | 'education_conflict'
  | 'employment_timeline'
  | 'wage_inconsistency'
  | 'credential_gap'
  | 'duplicate_evidence'
  | 'specialty_occupation_alignment';

export type FindingSeverity = 'informational' | 'low' | 'medium' | 'high';

export type ReviewStatus =
  | 'awaiting_review'
  | 'confirmed'
  | 'corrected'
  | 'dismissed'
  | 'evidence_requested'
  | 'assigned_for_attorney_review';

export interface IAffectedDocument {
  documentId: Types.ObjectId;
  documentTitle: string;
  category: string;
  pageNumber?: number;
  quoteExcerpt?: string;
  extractedValue?: string;
}

export interface IEvidenceFindingRecord extends MongooseDoc {
  findingId: string;
  applicationId: Types.ObjectId;
  analysisId?: string;
  category: FindingCategory;
  title: string;
  severity: FindingSeverity;
  affectedDocuments: IAffectedDocument[];
  extractedValues: Array<{
    field: string;
    value: string;
    source: string;
  }>;
  explanation: string;
  confidence: number;
  uncertaintyDetails?: string;
  recommendedReviewAction: string;
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  assignedAttorneyId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  humanCorrection?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceFindingSchema = new Schema<IEvidenceFindingRecord>(
  {
    findingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    analysisId: {
      type: String,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'identity_discrepancy',
        'education_conflict',
        'employment_timeline',
        'wage_inconsistency',
        'credential_gap',
        'duplicate_evidence',
        'specialty_occupation_alignment',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['informational', 'low', 'medium', 'high'],
      required: true,
      index: true,
    },
    affectedDocuments: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'DocumentRecord' },
        documentTitle: { type: String, required: true },
        category: { type: String, required: true },
        pageNumber: { type: Number },
        quoteExcerpt: { type: String },
        extractedValue: { type: String },
      },
    ],
    extractedValues: [
      {
        field: { type: String, required: true },
        value: { type: String, required: true },
        source: { type: String, required: true },
      },
    ],
    explanation: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.9,
    },
    uncertaintyDetails: {
      type: String,
    },
    recommendedReviewAction: {
      type: String,
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: [
        'awaiting_review',
        'confirmed',
        'corrected',
        'dismissed',
        'evidence_requested',
        'assigned_for_attorney_review',
      ],
      default: 'awaiting_review',
      index: true,
    },
    reviewNotes: {
      type: String,
    },
    assignedAttorneyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    humanCorrection: {
      type: String,
    },
  },
  { timestamps: true }
);

// -----------------------------------------------------------------------------
// 3. VISA CRITERIA MAPPING SCHEMA
// -----------------------------------------------------------------------------
export type CriterionLinkStatus =
  | 'supported'
  | 'partially_supported'
  | 'unsupported'
  | 'needs_review';

export interface IEvidenceMappingRecord extends MongooseDoc {
  applicationId: Types.ObjectId;
  visaCategory: 'H-1B' | 'O-1' | 'EB-2' | 'EB-2-NIW' | 'EB-2 NIW';
  criterionKey: string;
  criterionTitle: string;
  criterionProng?: string;
  statutoryBasis: string;
  status: CriterionLinkStatus;
  mappedDocuments: Array<{
    documentId: Types.ObjectId;
    documentTitle: string;
    relevanceSummary: string;
  }>;
  notes?: string;
  confidence: number;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceMappingSchema = new Schema<IEvidenceMappingRecord>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    visaCategory: {
      type: String,
      enum: ['H-1B', 'O-1', 'EB-2', 'EB-2-NIW', 'EB-2 NIW'],
      required: true,
      index: true,
    },
    criterionKey: {
      type: String,
      required: true,
    },
    criterionTitle: {
      type: String,
      required: true,
    },
    criterionProng: {
      type: String,
    },
    statutoryBasis: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['supported', 'partially_supported', 'unsupported', 'needs_review'],
      default: 'unsupported',
      index: true,
    },
    mappedDocuments: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'DocumentRecord' },
        documentTitle: { type: String, required: true },
        relevanceSummary: { type: String, required: true },
      },
    ],
    notes: {
      type: String,
    },
    confidence: {
      type: Number,
      default: 0.85,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// -----------------------------------------------------------------------------
// 4. EVIDENCE GAP ANALYSIS SCHEMA
// -----------------------------------------------------------------------------
export interface IEvidenceGapRecord extends MongooseDoc {
  applicationId: Types.ObjectId;
  visaCategory: string;
  checklistKey: string;
  requiredItem: string;
  description: string;
  statutoryImportance: string;
  priority: 'high' | 'medium' | 'low';
  resolutionStatus: 'open' | 'resolved' | 'waived';
  waivedReason?: string;
  resolvedWithDocumentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceGapSchema = new Schema<IEvidenceGapRecord>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    visaCategory: {
      type: String,
      required: true,
    },
    checklistKey: {
      type: String,
      required: true,
    },
    requiredItem: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    statutoryImportance: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    resolutionStatus: {
      type: String,
      enum: ['open', 'resolved', 'waived'],
      default: 'open',
      index: true,
    },
    waivedReason: {
      type: String,
    },
    resolvedWithDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentRecord',
    },
  },
  { timestamps: true }
);

// Exports
export const EvidenceAnalysis = mongoose.model<IEvidenceAnalysis>(
  'EvidenceAnalysis',
  EvidenceAnalysisSchema
);

export const EvidenceFindingRecord = mongoose.model<IEvidenceFindingRecord>(
  'EvidenceFindingRecord',
  EvidenceFindingSchema
);

export const EvidenceMapping = mongoose.model<IEvidenceMappingRecord>(
  'EvidenceMapping',
  EvidenceMappingSchema
);

export const EvidenceGap = mongoose.model<IEvidenceGapRecord>(
  'EvidenceGap',
  EvidenceGapSchema
);
