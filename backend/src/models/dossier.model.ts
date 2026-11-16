// backend/src/models/dossier.model.ts
// MongoDB Mongoose Model for Phase 8: Dossier Automation, Case Readiness Scoring,
// Grounded AI Case Summaries, Attorney Review Adjudications, and Bates Stamping.

import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type DossierStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'finalized';

export interface IReadinessBreakdownItem {
  score: number;
  max: number;
  satisfied: boolean;
  details: string;
}

export interface ICaseReadinessScore {
  overallScore: number;
  breakdown: {
    requiredDocsAvailable: IReadinessBreakdownItem;
    evidenceVerification: IReadinessBreakdownItem;
    missingEvidence: IReadinessBreakdownItem;
    unresolvedInconsistencies: IReadinessBreakdownItem;
    attorneyReview: IReadinessBreakdownItem;
  };
  formulaExplanation: string;
  scoringVersion: string;
  calculatedAt: Date;
  disclaimer: string;
}

export interface IAiCaseSummary {
  overview: string;
  evidenceSummary: string;
  documentReferences: Array<{
    documentId: Types.ObjectId;
    title: string;
    exhibitCode: string;
    category: string;
    verifiedFactsCount: number;
  }>;
  identifiedInconsistencies: Array<{
    findingId: Types.ObjectId;
    title: string;
    severity: string;
    reviewStatus: string;
  }>;
  outstandingRequirements: string[];
  suggestedReviewActions: string[];
  generatedAt: Date;
  isEditedByHuman: boolean;
  editedBy?: Types.ObjectId;
  editedAt?: Date;
  rawModelResponse?: string;
}

export interface IDossierSection {
  key: string;
  title: string;
  pageOffset: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IBatesNumbering {
  prefix: string;
  startNumber: number;
  endNumber: number;
  totalCount: number;
}

export interface IAttorneyReviewAdjudication {
  reviewerId?: Types.ObjectId;
  reviewerName?: string;
  reviewerRole?: string;
  reviewedAt?: Date;
  decision?: 'approved' | 'changes_requested' | 'rejected';
  comments?: string;
  requestedEvidence?: string[];
}

export interface IDossierAuditLog {
  action: string;
  performedBy: Types.ObjectId;
  userRole: string;
  timestamp: Date;
  notes?: string;
  version: number;
}

export interface IDossier extends MongooseDoc {
  dossierId: string;
  applicationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  version: number;
  status: DossierStatus;
  visaCategory: string;
  targetFilingDate?: Date;
  readinessScore: ICaseReadinessScore;
  aiCaseSummary: IAiCaseSummary;
  sections: IDossierSection[];
  batesNumbering: IBatesNumbering;
  attorneyReview: IAttorneyReviewAdjudication;
  auditHistory: IDossierAuditLog[];
  pdfExport?: {
    generatedAt: Date;
    pageCount: number;
    fileSize: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReadinessBreakdownItemSchema = new Schema<IReadinessBreakdownItem>(
  {
    score: { type: Number, required: true },
    max: { type: Number, required: true },
    satisfied: { type: Boolean, required: true },
    details: { type: String, required: true },
  },
  { _id: false }
);

const CaseReadinessScoreSchema = new Schema<ICaseReadinessScore>(
  {
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      requiredDocsAvailable: { type: ReadinessBreakdownItemSchema, required: true },
      evidenceVerification: { type: ReadinessBreakdownItemSchema, required: true },
      missingEvidence: { type: ReadinessBreakdownItemSchema, required: true },
      unresolvedInconsistencies: { type: ReadinessBreakdownItemSchema, required: true },
      attorneyReview: { type: ReadinessBreakdownItemSchema, required: true },
    },
    formulaExplanation: { type: String, required: true },
    scoringVersion: { type: String, default: '1.0-case-readiness' },
    calculatedAt: { type: Date, default: Date.now },
    disclaimer: {
      type: String,
      default:
        'The Case Readiness Score measures dossier completeness only and does not constitute an official visa approval probability or legal advice.',
    },
  },
  { _id: false }
);

const AiCaseSummarySchema = new Schema<IAiCaseSummary>(
  {
    overview: { type: String, required: true },
    evidenceSummary: { type: String, required: true },
    documentReferences: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'DocumentRecord', required: true },
        title: { type: String, required: true },
        exhibitCode: { type: String, required: true },
        category: { type: String, required: true },
        verifiedFactsCount: { type: Number, default: 0 },
      },
    ],
    identifiedInconsistencies: [
      {
        findingId: { type: Schema.Types.ObjectId, ref: 'DiscrepancyFinding' },
        title: { type: String, required: true },
        severity: { type: String, required: true },
        reviewStatus: { type: String, required: true },
      },
    ],
    outstandingRequirements: [{ type: String }],
    suggestedReviewActions: [{ type: String }],
    generatedAt: { type: Date, default: Date.now },
    isEditedByHuman: { type: Boolean, default: false },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date },
    rawModelResponse: { type: String },
  },
  { _id: false }
);

const DossierSectionSchema = new Schema<IDossierSection>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    pageOffset: { type: Number, required: true, default: 1 },
    content: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const BatesNumberingSchema = new Schema<IBatesNumbering>(
  {
    prefix: { type: String, required: true },
    startNumber: { type: Number, required: true, default: 1 },
    endNumber: { type: Number, required: true, default: 1 },
    totalCount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const AttorneyReviewAdjudicationSchema = new Schema<IAttorneyReviewAdjudication>(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewerName: { type: String },
    reviewerRole: { type: String },
    reviewedAt: { type: Date },
    decision: {
      type: String,
      enum: ['approved', 'changes_requested', 'rejected'],
    },
    comments: { type: String },
    requestedEvidence: [{ type: String }],
  },
  { _id: false }
);

const DossierAuditLogSchema = new Schema<IDossierAuditLog>(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
    version: { type: Number, required: true },
  },
  { _id: false }
);

const DossierSchema = new Schema<IDossier>(
  {
    dossierId: {
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'changes_requested', 'approved', 'finalized'],
      default: 'draft',
      index: true,
    },
    visaCategory: {
      type: String,
      required: true,
      index: true,
    },
    targetFilingDate: {
      type: Date,
    },
    readinessScore: {
      type: CaseReadinessScoreSchema,
      required: true,
    },
    aiCaseSummary: {
      type: AiCaseSummarySchema,
      required: true,
    },
    sections: [DossierSectionSchema],
    batesNumbering: {
      type: BatesNumberingSchema,
      required: true,
    },
    attorneyReview: {
      type: AttorneyReviewAdjudicationSchema,
      default: {},
    },
    auditHistory: [DossierAuditLogSchema],
    pdfExport: {
      generatedAt: { type: Date },
      pageCount: { type: Number },
      fileSize: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for application and version history
DossierSchema.index({ applicationId: 1, version: -1 });

export const DossierModel =
  (mongoose.models.Dossier as mongoose.Model<IDossier>) ||
  mongoose.model<IDossier>('Dossier', DossierSchema);

