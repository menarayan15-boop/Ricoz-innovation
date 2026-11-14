export type UserRole = 'applicant' | 'attorney' | 'employer' | 'admin';

export type VisaCategory = 'H-1B' | 'O-1' | 'EB-2' | 'EB-2-NIW';

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
  changedAt: Date | string;
  changedBy?: string | any;
  reason?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

