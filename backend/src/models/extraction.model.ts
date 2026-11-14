// backend/src/models/extraction.model.ts
// MongoDB Mongoose Models for Document Extractions, Structured Fields & Evidence Findings

import mongoose, { Document as MongooseDoc, Schema, Model, Types } from 'mongoose';

export type ExtractionMethod = 'native_text' | 'ocr' | 'docx';

export interface IDocumentExtraction extends MongooseDoc {
  documentId: Types.ObjectId;
  applicationId: Types.ObjectId;
  extractedText: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
  extractionMethod: ExtractionMethod;
  ocrStatus: 'not_applicable' | 'queued' | 'processing' | 'completed' | 'failed' | 'needs_review';
  ocrConfidence?: number;
  checksum: string;
  wordCount: number;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExtractedField extends MongooseDoc {
  documentId: Types.ObjectId;
  applicationId: Types.ObjectId;
  category: 'identity' | 'education' | 'employment' | 'achievements' | 'legal';
  fieldName: string;
  fieldValue: string;
  pageNumber?: number;
  quoteExcerpt?: string;
  confidence: number;
  verificationStatus: 'unverified' | 'confirmed' | 'corrected' | 'dismissed';
  humanCorrection?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEvidenceFinding extends MongooseDoc {
  applicationId: Types.ObjectId;
  findingType:
    | 'inconsistent_name'
    | 'date_overlap'
    | 'salary_below_prevailing_wage'
    | 'missing_degree_evaluation'
    | 'missing_mandatory_exhibit'
    | 'potential_duplicate';
  affectedDocuments: Types.ObjectId[];
  title: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'acknowledged' | 'resolved' | 'dismissed';
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentExtractionSchema = new Schema<IDocumentExtraction>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentRecord',
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
    extractedText: {
      type: String,
      required: true,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    pages: [
      {
        pageNumber: { type: Number, required: true },
        text: { type: String, required: true },
      },
    ],
    extractionMethod: {
      type: String,
      enum: ['native_text', 'ocr', 'docx'],
      required: true,
    },
    ocrStatus: {
      type: String,
      enum: ['not_applicable', 'queued', 'processing', 'completed', 'failed', 'needs_review'],
      default: 'completed',
      index: true,
    },
    ocrConfidence: {
      type: Number,
    },
    checksum: {
      type: String,
      required: true,
      index: true,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    errorDetails: {
      type: String,
    },
  },
  { timestamps: true }
);

const extractedFieldSchema = new Schema<IExtractedField>(
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
    category: {
      type: String,
      enum: ['identity', 'education', 'employment', 'achievements', 'legal'],
      required: true,
      index: true,
    },
    fieldName: {
      type: String,
      required: true,
      index: true,
    },
    fieldValue: {
      type: String,
      required: true,
    },
    pageNumber: {
      type: Number,
    },
    quoteExcerpt: {
      type: String,
    },
    confidence: {
      type: Number,
      default: 0.9,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'confirmed', 'corrected', 'dismissed'],
      default: 'unverified',
      index: true,
    },
    humanCorrection: {
      type: String,
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

extractedFieldSchema.index({ applicationId: 1, category: 1 });

const evidenceFindingSchema = new Schema<IEvidenceFinding>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    findingType: {
      type: String,
      enum: [
        'inconsistent_name',
        'date_overlap',
        'salary_below_prevailing_wage',
        'missing_degree_evaluation',
        'missing_mandatory_exhibit',
        'potential_duplicate',
      ],
      required: true,
      index: true,
    },
    affectedDocuments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'DocumentRecord',
      },
    ],
    title: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['detected', 'acknowledged', 'resolved', 'dismissed'],
      default: 'detected',
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

evidenceFindingSchema.index({ applicationId: 1, status: 1 });

export const DocumentExtraction: Model<IDocumentExtraction> =
  mongoose.models.DocumentExtraction ||
  mongoose.model<IDocumentExtraction>('DocumentExtraction', documentExtractionSchema);

export const ExtractedField: Model<IExtractedField> =
  mongoose.models.ExtractedField ||
  mongoose.model<IExtractedField>('ExtractedField', extractedFieldSchema);

export const EvidenceFinding: Model<IEvidenceFinding> =
  mongoose.models.EvidenceFinding ||
  mongoose.model<IEvidenceFinding>('EvidenceFinding', evidenceFindingSchema);

