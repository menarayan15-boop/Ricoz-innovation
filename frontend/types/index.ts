export type UserRole = 'applicant' | 'attorney' | 'employer' | 'admin';

export type VisaCategory = 'H-1B' | 'O-1' | 'EB-2' | 'EB-2-NIW';

export interface AuthUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
}

export interface BackendHealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  database: {
    connected: boolean;
    mode: 'persistent' | 'in-memory' | 'external';
    isPersistent: boolean;
    isMemoryDb: boolean;
    readyState?: number;
  };
  system: {
    nodeVersion: string;
    memoryUsageMB: number;
  };
}

export interface DatabaseHealthResponse {
  success: boolean;
  status: string;
  readyState: number;
  host: string;
  databaseName: string;
  isMemoryDb: boolean;
  isPersistent: boolean;
  storageType?: string;
  pingLatencyMs: number;
  message?: string;
  timestamp: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'in_progress'
  | 'evidence_pending'
  | 'under_attorney_review'
  | 'changes_requested'
  | 'ready_for_final_review'
  | 'approved_for_submission'
  | 'dossier_prepared'
  | 'documents_pending'
  | 'ai_analyzed'
  | 'archived';

export interface ApplicantDetails {
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  currentImmigrationStatus?: string;
  alienRegistrationNumber?: string;
}

export interface EducationDetails {
  highestQualification?: string;
  institution?: string;
  fieldOfStudy?: string;
  graduationYear?: number | string;
  foreignDegreeEvaluated?: boolean;
  degreeEvaluationAgency?: string;
}

export interface EmploymentDetails {
  currentEmployer?: string;
  jobTitle?: string;
  dutiesSummary?: string;
  annualSalary?: number | string;
  workLocationCity?: string;
  workLocationState?: string;
  yearsOfExperience?: number | string;
}

export interface H1BDetails {
  lcaNumber?: string;
  lcaCertifiedDate?: string;
  socCode?: string;
  prevailingWage?: number | string;
  specialtyOccupationArgument?: string;
}

export interface O1Details {
  criteriaMet?: string[];
  achievementsSummary?: string;
  majorPrizes?: string;
  scholarlyArticles?: string;
  originalContributions?: string;
  criticalEmploymentRoles?: string;
  highRemunerationProof?: string;
  peerAdvisoryOpinion?: string;
}

export interface EB2Details {
  subCategory?: 'advanced_degree' | 'exceptional_ability';
  permCaseNumber?: string;
  permFilingDate?: string;
  progressiveExperienceLetters?: string;
}

export interface EB2NIWDetails {
  proposedEndeavorTitle?: string;
  proposedEndeavorDescription?: string;
  prong1SubstantialMerit?: string;
  prong2WellPositioned?: string;
  prong3NationalImportance?: string;
  expertLettersCount?: number;
}

export type CategorySpecificDetails =
  | H1BDetails
  | O1Details
  | EB2Details
  | EB2NIWDetails
  | Record<string, unknown>;

export interface StatusHistoryItem {
  status: ApplicationStatus;
  changedAt: string;
  changedBy?: string;
  reason?: string;
}

export interface ChecklistItem {
  id: string;
  section: string;
  label: string;
  description: string;
  required: boolean;
  isCompleted: boolean;
  isCustom?: boolean;
  conditional?: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface ApplicationRecord {
  _id: string;
  id?: string;
  applicantId: string | { _id: string; name: string; email: string };
  assignedAttorneyId?: string | { _id: string; name: string; email: string };
  employerId?: string | { _id: string; name: string; email: string };
  visaCategory: VisaCategory;
  title: string;
  status: ApplicationStatus;
  currentStep: number;
  draftStep?: number;
  targetFilingDate?: string;
  applicantDetails?: ApplicantDetails;
  educationDetails?: EducationDetails;
  employmentDetails?: EmploymentDetails;
  categorySpecificDetails?: CategorySpecificDetails;
  statusHistory?: StatusHistoryItem[];
  progressPercentage?: number;
  concurrencyVersion?: number;
  formData: Record<string, unknown>;
  checklist: ChecklistItem[];
  missingEvidenceRequests?: Array<{
    documentName: string;
    reason: string;
    requestedAt: string;
  }>;
  reviewDecision?: {
    status: 'approved' | 'changes_requested' | 'rejected';
    comments: string;
    reviewedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalCases: number;
  activePetitions: number;
  exhibitsUploaded: number;
  attorneyReview: number;
  missingEvidence: number;
  finalDossiers: number;
}

export interface DashboardSummaryResponse {
  success: boolean;
  stats: DashboardStats;
  categoryCounts: Record<string, number>;
  recentApplications: ApplicationRecord[];
  userRole: UserRole;
  timestamp: string;
}

export type DocumentReviewStatus =
  | 'uploaded'
  | 'pending_review'
  | 'verified'
  | 'correction_requested'
  | 'rejected'
  | 'pending'
  | 'needs_reupload';

export interface DocumentRecord {
  _id: string;
  documentId?: string;
  applicationId: string;
  ownerId: string;
  uploadedBy?: string | { _id: string; name: string; email: string; role: string };
  title: string;
  category: string;
  suggestedCategory?: string;
  suggestedReason?: string;
  confidenceScore?: number;
  originalFilename: string;
  storedFilename?: string;
  storageKey?: string;
  storageProvider?: 'local' | 's3' | 'r2';
  mimeType: string;
  fileSize: number;
  visaCategory?: VisaCategory;
  checklistItemId?: string;
  reviewStatus: DocumentReviewStatus;
  reviewNotes?: string;
  reviewedBy?: string | { _id: string; name: string; email: string; role: string };
  reviewedAt?: string;
  versionNumber?: number;
  isCurrentVersion?: boolean;
  parentDocumentId?: string;
  versionNotes?: string;
  checksum?: string;
  metadata?: {
    pageCount?: number;
    dimensions?: { width: number; height: number };
    ocrStatus?: string;
    extractedMetadata?: Record<string, unknown>;
  };
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentActivityRecord {
  _id: string;
  documentId: string;
  applicationId: string;
  actorId: { _id: string; name: string; email: string; role: string } | string;
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
  timestamp: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface DocumentWorkspaceStats {
  totalDocuments: number;
  pendingReview: number;
  verifiedDocuments: number;
  correctionsRequested: number;
}

// =========================================================================
// PHASE 6: AI ASSISTANT, OCR & INTELLIGENT DOCUMENT ANALYSIS TYPES
// =========================================================================

export interface AICitation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  quoteExcerpt: string;
  confidence?: number;
}

export interface AIMessageRecord {
  _id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: AICitation[];
  tokenCount?: number;
  createdAt: string;
}

export interface AIConversationRecord {
  _id: string;
  conversationId: string;
  userId: string;
  applicationId?: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentExtractionRecord {
  _id: string;
  documentId: string;
  applicationId: string;
  extractedText: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
  extractionMethod: 'native_text' | 'ocr' | 'docx';
  ocrStatus: 'not_applicable' | 'queued' | 'processing' | 'completed' | 'failed' | 'needs_review';
  ocrConfidence?: number;
  wordCount: number;
  createdAt: string;
}

export interface ExtractedFieldRecord {
  _id: string;
  documentId: string;
  applicationId: string;
  category: 'identity' | 'education' | 'employment' | 'achievements' | 'legal';
  fieldName: string;
  fieldValue: string;
  pageNumber?: number;
  quoteExcerpt?: string;
  confidence: number;
  verificationStatus: 'unverified' | 'confirmed' | 'corrected' | 'dismissed';
  humanCorrection?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface EvidenceFindingRecord {
  _id: string;
  applicationId: string;
  findingType:
    | 'inconsistent_name'
    | 'date_overlap'
    | 'salary_below_prevailing_wage'
    | 'missing_degree_evaluation'
    | 'missing_mandatory_exhibit'
    | 'potential_duplicate';
  affectedDocuments: string[];
  title: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'acknowledged' | 'resolved' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Phase 7: Evidence Intelligence & Cross-Document Verification Types
// -----------------------------------------------------------------------------
export type Phase7FindingCategory =
  | 'identity_discrepancy'
  | 'education_conflict'
  | 'employment_timeline'
  | 'wage_inconsistency'
  | 'credential_gap'
  | 'duplicate_evidence'
  | 'specialty_occupation_alignment';

export type Phase7FindingSeverity = 'informational' | 'low' | 'medium' | 'high';

export type Phase7ReviewStatus =
  | 'awaiting_review'
  | 'confirmed'
  | 'corrected'
  | 'dismissed'
  | 'evidence_requested'
  | 'assigned_for_attorney_review';

export interface Phase7AffectedDocument {
  documentId: string;
  documentTitle: string;
  category: string;
  pageNumber?: number;
  quoteExcerpt?: string;
  extractedValue?: string;
}

export interface Phase7Finding {
  _id: string;
  findingId: string;
  applicationId: string;
  analysisId?: string;
  category: Phase7FindingCategory;
  title: string;
  severity: Phase7FindingSeverity;
  affectedDocuments: Phase7AffectedDocument[];
  extractedValues: Array<{ field: string; value: string; source: string }>;
  explanation: string;
  confidence: number;
  uncertaintyDetails?: string;
  recommendedReviewAction: string;
  reviewStatus: Phase7ReviewStatus;
  reviewNotes?: string;
  humanCorrection?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface EvidenceAnalysisItem {
  _id: string;
  analysisId: string;
  applicationId: string;
  runBy?: { _id: string; name: string; email: string; role: string };
  status: 'queued' | 'running' | 'completed' | 'failed';
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
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface EvidenceGapItem {
  _id: string;
  applicationId: string;
  visaCategory: string;
  checklistKey: string;
  requiredItem: string;
  description: string;
  statutoryImportance: string;
  priority: 'high' | 'medium' | 'low';
  resolutionStatus: 'open' | 'resolved' | 'waived';
  waivedReason?: string;
  resolvedWithDocumentId?: string;
  createdAt: string;
}

export interface EvidenceMappingItem {
  _id: string;
  applicationId: string;
  visaCategory: string;
  criterionKey: string;
  criterionTitle: string;
  criterionProng?: string;
  statutoryBasis: string;
  status: 'supported' | 'partially_supported' | 'unsupported' | 'needs_review';
  mappedDocuments: Array<{
    documentId: string;
    documentTitle: string;
    relevanceSummary: string;
  }>;
  notes?: string;
  confidence: number;
  createdAt: string;
}

export interface EvidenceMatrixRow {
  id: string;
  domain: string;
  attribute: string;
  values: Array<{
    documentId: string;
    documentTitle: string;
    category: string;
    extractedValue: string;
  }>;
  status: 'consistent' | 'discrepancy' | 'single_source' | 'missing';
  notes?: string;
}

export interface EvidenceMatrixData {
  documentsCount: number;
  rows: EvidenceMatrixRow[];
}

export interface EvidenceReport {
  reportId: string;
  generatedAt: string;
  generatedBy: { id: string; name: string; email: string; role: string };
  application: { id: string; category: string; title: string; status: string; createdAt: string };
  summary: {
    documentsCount: number;
    findingsCount: number;
    openFindingsCount: number;
    gapsCount: number;
    criteriaCoveragePercentage: number;
  };
  documents: Array<{ id: string; name: string; category: string; checksum?: string; pageCount?: number }>;
  verifiedFacts: string[];
  findings: Array<{
    id: string;
    category: string;
    title: string;
    severity: string;
    reviewStatus: string;
    explanation: string;
    recommendedAction: string;
    affectedDocuments: string[];
  }>;
  evidenceGaps: Array<{ item: string; description: string; priority: string; status: string }>;
  statutoryCriteria: Array<{ criterion: string; prong?: string; status: string; mappedExhibitCount: number }>;
  auditNotes: string;
}

// =========================================================================
// PHASE 8: AI-POWERED DOSSIER AUTOMATION & CASE READINESS TYPES
// =========================================================================

export type DossierStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'finalized';

export interface ReadinessBreakdownItem {
  score: number;
  max: number;
  satisfied: boolean;
  details: string;
}

export interface CaseReadinessScore {
  overallScore: number;
  breakdown: {
    requiredDocsAvailable: ReadinessBreakdownItem;
    evidenceVerification: ReadinessBreakdownItem;
    missingEvidence: ReadinessBreakdownItem;
    unresolvedInconsistencies: ReadinessBreakdownItem;
    attorneyReview: ReadinessBreakdownItem;
  };
  formulaExplanation: string;
  scoringVersion: string;
  calculatedAt: string;
  disclaimer: string;
}

export interface AiCaseSummary {
  overview: string;
  evidenceSummary: string;
  documentReferences: Array<{
    documentId: string;
    title: string;
    exhibitCode: string;
    category: string;
    verifiedFactsCount: number;
  }>;
  identifiedInconsistencies: Array<{
    findingId: string;
    title: string;
    severity: string;
    reviewStatus: string;
  }>;
  outstandingRequirements: string[];
  suggestedReviewActions: string[];
  generatedAt: string;
  isEditedByHuman: boolean;
  editedBy?: string;
  editedAt?: string;
}

export interface DossierSectionRecord {
  key: string;
  title: string;
  pageOffset: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface DossierRecord {
  _id: string;
  dossierId: string;
  applicationId: string;
  createdBy: string;
  version: number;
  status: DossierStatus;
  visaCategory: string;
  targetFilingDate?: string;
  readinessScore: CaseReadinessScore;
  aiCaseSummary: AiCaseSummary;
  sections: DossierSectionRecord[];
  batesNumbering: {
    prefix: string;
    startNumber: number;
    endNumber: number;
    totalCount: number;
  };
  attorneyReview: {
    reviewerId?: string;
    reviewerName?: string;
    reviewerRole?: string;
    reviewedAt?: string;
    decision?: 'approved' | 'changes_requested' | 'rejected';
    comments?: string;
    requestedEvidence?: string[];
  };
  auditHistory: Array<{
    action: string;
    performedBy: string;
    userRole: string;
    timestamp: string;
    notes?: string;
    version: number;
  }>;
  pdfExport?: {
    generatedAt: string;
    pageCount: number;
    fileSize: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DossierHistoryItem {
  dossierId: string;
  version: number;
  status: DossierStatus;
  readinessScore: number;
  createdAt: string;
  updatedAt: string;
}
