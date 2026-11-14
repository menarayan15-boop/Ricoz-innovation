import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import {
  VisaCategory,
  ApplicationStatus,
  ApplicantDetails,
  EducationDetails,
  EmploymentDetails,
  CategorySpecificDetails,
  StatusHistoryItem,
} from '../types/index.js';
import { getPreliminaryChecklist, IChecklistItem } from '../utils/checklists.js';

export interface IAttorneyNote {
  note: string;
  attorneyId: Types.ObjectId;
  createdAt: Date;
}

export interface IMissingEvidenceRequest {
  documentName: string;
  reason: string;
  requestedAt: Date;
}

export interface IApplication extends Document {
  applicantId: Types.ObjectId;
  assignedAttorneyId?: Types.ObjectId;
  employerId?: Types.ObjectId;
  visaCategory: VisaCategory;
  title: string;
  status: ApplicationStatus;
  currentStep: number;
  draftStep: number;
  progressPercentage: number;
  concurrencyVersion: number;
  targetFilingDate?: Date;
  applicantDetails?: ApplicantDetails;
  educationDetails?: EducationDetails;
  employmentDetails?: EmploymentDetails;
  categorySpecificDetails?: CategorySpecificDetails;
  statusHistory: StatusHistoryItem[];
  formData: Record<string, unknown>;
  checklist: IChecklistItem[];
  attorneyNotes: IAttorneyNote[];
  missingEvidenceRequests: IMissingEvidenceRequest[];
  reviewDecision?: {
    status: 'approved' | 'changes_requested' | 'rejected';
    comments: string;
    reviewedAt: Date;
    reviewerId: Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant ID is required'],
      index: true,
    },
    assignedAttorneyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    employerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    visaCategory: {
      type: String,
      enum: ['H-1B', 'O-1', 'EB-2', 'EB-2-NIW'],
      required: [true, 'Visa category is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Application title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    status: {
      type: String,
      enum: [
        'draft',
        'in_progress',
        'evidence_pending',
        'under_attorney_review',
        'changes_requested',
        'ready_for_final_review',
        'approved_for_submission',
        'dossier_prepared',
        'documents_pending',
        'ai_analyzed',
        'archived',
      ],
      default: 'draft',
      index: true,
    },
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
    draftStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    concurrencyVersion: {
      type: Number,
      default: 1,
    },
    targetFilingDate: {
      type: Date,
    },
    applicantDetails: {
      fullName: { type: String, trim: true },
      dateOfBirth: { type: String },
      nationality: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      currentImmigrationStatus: { type: String, trim: true },
      alienRegistrationNumber: { type: String, trim: true },
    },
    educationDetails: {
      highestQualification: { type: String, trim: true },
      institution: { type: String, trim: true },
      fieldOfStudy: { type: String, trim: true },
      graduationYear: { type: Schema.Types.Mixed },
      foreignDegreeEvaluated: { type: Boolean, default: false },
      degreeEvaluationAgency: { type: String, trim: true },
    },
    employmentDetails: {
      currentEmployer: { type: String, trim: true },
      jobTitle: { type: String, trim: true },
      dutiesSummary: { type: String },
      annualSalary: { type: Schema.Types.Mixed },
      workLocationCity: { type: String, trim: true },
      workLocationState: { type: String, trim: true },
      yearsOfExperience: { type: Schema.Types.Mixed },
    },
    categorySpecificDetails: {
      type: Schema.Types.Mixed,
      default: {},
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
      },
    ],
    formData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    checklist: [
      {
        id: { type: String, required: true },
        section: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String, default: '' },
        required: { type: Boolean, default: true },
        isCompleted: { type: Boolean, default: false },
        isCustom: { type: Boolean, default: false },
        conditional: { type: Boolean, default: false },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    attorneyNotes: [
      {
        note: { type: String, required: true },
        attorneyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    missingEvidenceRequests: [
      {
        documentName: { type: String, required: true },
        reason: { type: String, required: true },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    reviewDecision: {
      status: {
        type: String,
        enum: ['approved', 'changes_requested', 'rejected'],
      },
      comments: String,
      reviewedAt: Date,
      reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal querying
applicationSchema.index({ applicantId: 1, updatedAt: -1 });
applicationSchema.index({ visaCategory: 1, status: 1 });
applicationSchema.index({ assignedAttorneyId: 1, status: 1 });
applicationSchema.index({ employerId: 1, status: 1 });

// Populate default checklist if empty upon creation
applicationSchema.pre('save', function (next) {
  if (this.isNew && (!this.checklist || this.checklist.length === 0)) {
    this.checklist = getPreliminaryChecklist(this.visaCategory);
  }

  // Calculate progress percentage based on checklist completion & filled sections
  if (this.checklist && this.checklist.length > 0) {
    const total = this.checklist.length;
    const completed = this.checklist.filter((i) => i.isCompleted).length;
    this.progressPercentage = Math.round((completed / total) * 100);
  }

  // Track initial status history if new
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [
      {
        status: this.status,
        changedAt: new Date(),
        reason: 'Application initialized',
      },
    ];
  }

  next();
});

export const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>('Application', applicationSchema);
export { IChecklistItem };
