'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  FilePlus2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Sparkles,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
  Scale,
  RefreshCw,
  Save,
  Check,
  Plus,
  Clock,
  User,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VisaCategory, ApplicationRecord, ChecklistItem } from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

function ApplicationWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get('id');

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [applicationId, setApplicationId] = useState<string | null>(existingId);
  const [concurrencyVersion, setConcurrencyVersion] = useState<number>(1);
  const [isInitializing, setIsInitializing] = useState<boolean>(Boolean(existingId));

  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState<boolean>(false);
  const [submittedApplication, setSubmittedApplication] = useState<ApplicationRecord | null>(null);

  // STEP 1 — Visa Category
  const [selectedVisa, setSelectedVisa] = useState<VisaCategory>('H-1B');

  // STEP 2 — Applicant Details
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentImmigrationStatus, setCurrentImmigrationStatus] = useState('H-1B');
  const [alienRegistrationNumber, setAlienRegistrationNumber] = useState('');

  // STEP 3 — Education & Employment
  const [highestQualification, setHighestQualification] = useState("Master's Degree");
  const [institution, setInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [foreignDegreeEvaluated, setForeignDegreeEvaluated] = useState(false);
  const [degreeEvaluationAgency, setDegreeEvaluationAgency] = useState('');
  const [currentEmployer, setCurrentEmployer] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [annualSalary, setAnnualSalary] = useState('');
  const [workLocationCity, setWorkLocationCity] = useState('');
  const [workLocationState, setWorkLocationState] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [dutiesSummary, setDutiesSummary] = useState('');

  // STEP 4 — Visa-Specific Fields
  // H-1B
  const [lcaNumber, setLcaNumber] = useState('');
  const [lcaCertifiedDate, setLcaCertifiedDate] = useState('');
  const [socCode, setSocCode] = useState('');
  const [prevailingWage, setPrevailingWage] = useState('');
  const [specialtyOccupationArgument, setSpecialtyOccupationArgument] = useState('');

  // O-1
  const [o1CriteriaMet, setO1CriteriaMet] = useState<string[]>([]);
  const [o1AchievementsSummary, setO1AchievementsSummary] = useState('');
  const [o1MajorPrizes, setO1MajorPrizes] = useState('');
  const [o1ScholarlyArticles, setO1ScholarlyArticles] = useState('');
  const [o1PeerAdvisoryOpinion, setO1PeerAdvisoryOpinion] = useState('');

  // EB-2
  const [eb2SubCategory, setEb2SubCategory] = useState<'advanced_degree' | 'exceptional_ability'>('advanced_degree');
  const [permCaseNumber, setPermCaseNumber] = useState('');
  const [permFilingDate, setPermFilingDate] = useState('');
  const [progressiveExperienceLetters, setProgressiveExperienceLetters] = useState('');

  // EB-2 NIW
  const [proposedEndeavorTitle, setProposedEndeavorTitle] = useState('');
  const [proposedEndeavorDescription, setProposedEndeavorDescription] = useState('');
  const [prong1SubstantialMerit, setProng1SubstantialMerit] = useState('');
  const [prong2WellPositioned, setProng2WellPositioned] = useState('');
  const [prong3NationalImportance, setProng3NationalImportance] = useState('');
  const [expertLettersCount, setExpertLettersCount] = useState<number>(5);

  // STEP 5 — Evidence Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [customItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomSection, setNewCustomSection] = useState('Additional Exhibits');
  const [newCustomRequired, setNewCustomRequired] = useState(false);

  // Resume Draft Loader
  useEffect(() => {
    if (!existingId) return;
    const loadDraft = async () => {
      try {
        const res = await apiClient.getApplication(existingId);
        if (res.success && res.application) {
          const app = res.application;
          setApplicationId(app._id);
          setSelectedVisa(app.visaCategory);
          setConcurrencyVersion(app.concurrencyVersion || 1);
          if (app.currentStep) setCurrentStep(app.currentStep);
          if (app.checklist) setChecklist(app.checklist);

          // Populate applicant details
          if (app.applicantDetails) {
            setFullName(app.applicantDetails.fullName || '');
            setDateOfBirth(app.applicantDetails.dateOfBirth || '');
            setNationality(app.applicantDetails.nationality || '');
            setEmail(app.applicantDetails.email || '');
            setPhone(app.applicantDetails.phone || '');
            setCurrentImmigrationStatus(app.applicantDetails.currentImmigrationStatus || 'H-1B');
            setAlienRegistrationNumber(app.applicantDetails.alienRegistrationNumber || '');
          }

          // Populate education details
          if (app.educationDetails) {
            setHighestQualification(app.educationDetails.highestQualification || "Master's Degree");
            setInstitution(app.educationDetails.institution || '');
            setFieldOfStudy(app.educationDetails.fieldOfStudy || '');
            setGraduationYear(String(app.educationDetails.graduationYear || ''));
            setForeignDegreeEvaluated(Boolean(app.educationDetails.foreignDegreeEvaluated));
            setDegreeEvaluationAgency(app.educationDetails.degreeEvaluationAgency || '');
          }

          // Populate employment details
          if (app.employmentDetails) {
            setCurrentEmployer(app.employmentDetails.currentEmployer || '');
            setJobTitle(app.employmentDetails.jobTitle || '');
            setAnnualSalary(String(app.employmentDetails.annualSalary || ''));
            setWorkLocationCity(app.employmentDetails.workLocationCity || '');
            setWorkLocationState(app.employmentDetails.workLocationState || '');
            setYearsOfExperience(String(app.employmentDetails.yearsOfExperience || ''));
            setDutiesSummary(app.employmentDetails.dutiesSummary || '');
          }

          // Populate category specific details
          const spec = app.categorySpecificDetails as Record<string, unknown> | undefined;
          if (spec) {
            if (app.visaCategory === 'H-1B') {
              setLcaNumber((spec.lcaNumber as string) || '');
              setLcaCertifiedDate((spec.lcaCertifiedDate as string) || '');
              setSocCode((spec.socCode as string) || '');
              setPrevailingWage(String(spec.prevailingWage || ''));
              setSpecialtyOccupationArgument((spec.specialtyOccupationArgument as string) || '');
            } else if (app.visaCategory === 'O-1') {
              setO1CriteriaMet((spec.criteriaMet as string[]) || []);
              setO1AchievementsSummary((spec.achievementsSummary as string) || '');
              setO1MajorPrizes((spec.majorPrizes as string) || '');
              setO1ScholarlyArticles((spec.scholarlyArticles as string) || '');
              setO1PeerAdvisoryOpinion((spec.peerAdvisoryOpinion as string) || '');
            } else if (app.visaCategory === 'EB-2') {
              setEb2SubCategory((spec.subCategory as 'advanced_degree' | 'exceptional_ability') || 'advanced_degree');
              setPermCaseNumber((spec.permCaseNumber as string) || '');
              setPermFilingDate((spec.permFilingDate as string) || '');
              setProgressiveExperienceLetters((spec.progressiveExperienceLetters as string) || '');
            } else if (app.visaCategory === 'EB-2-NIW') {
              setProposedEndeavorTitle((spec.proposedEndeavorTitle as string) || '');
              setProposedEndeavorDescription((spec.proposedEndeavorDescription as string) || '');
              setProng1SubstantialMerit((spec.prong1SubstantialMerit as string) || '');
              setProng2WellPositioned((spec.prong2WellPositioned as string) || '');
              setProng3NationalImportance((spec.prong3NationalImportance as string) || '');
              setExpertLettersCount(Number(spec.expertLettersCount) || 5);
            }
          }
        }
      } catch (err) {
        setErrorMessage('Failed to resume draft application.');
      } finally {
        setIsInitializing(false);
      }
    };
    loadDraft();
  }, [existingId]);

  // Construct Category Specific Payload
  const getCategorySpecificPayload = useCallback(() => {
    switch (selectedVisa) {
      case 'H-1B':
        return {
          lcaNumber,
          lcaCertifiedDate,
          socCode,
          prevailingWage,
          specialtyOccupationArgument,
        };
      case 'O-1':
        return {
          criteriaMet: o1CriteriaMet,
          achievementsSummary: o1AchievementsSummary,
          majorPrizes: o1MajorPrizes,
          scholarlyArticles: o1ScholarlyArticles,
          peerAdvisoryOpinion: o1PeerAdvisoryOpinion,
        };
      case 'EB-2':
        return {
          subCategory: eb2SubCategory,
          permCaseNumber,
          permFilingDate,
          progressiveExperienceLetters,
        };
      case 'EB-2-NIW':
        return {
          proposedEndeavorTitle,
          proposedEndeavorDescription,
          prong1SubstantialMerit,
          prong2WellPositioned,
          prong3NationalImportance,
          expertLettersCount,
        };
      default:
        return {};
    }
  }, [
    selectedVisa,
    lcaNumber,
    lcaCertifiedDate,
    socCode,
    prevailingWage,
    specialtyOccupationArgument,
    o1CriteriaMet,
    o1AchievementsSummary,
    o1MajorPrizes,
    o1ScholarlyArticles,
    o1PeerAdvisoryOpinion,
    eb2SubCategory,
    permCaseNumber,
    permFilingDate,
    progressiveExperienceLetters,
    proposedEndeavorTitle,
    proposedEndeavorDescription,
    prong1SubstantialMerit,
    prong2WellPositioned,
    prong3NationalImportance,
    expertLettersCount,
  ]);

  // Execute Draft Save
  const executeDraftSave = useCallback(
    async (manual: boolean = false) => {
      setSaveStatus('saving');
      try {
        const payload = {
          visaCategory: selectedVisa,
          title: fullName.trim() ? `${fullName.trim()} - ${selectedVisa} Petition` : `Draft ${selectedVisa} Petition`,
          currentStep,
          draftStep: currentStep,
          applicantDetails: {
            fullName: fullName.trim(),
            dateOfBirth,
            nationality: nationality.trim(),
            email: email.trim(),
            phone: phone.trim(),
            currentImmigrationStatus,
            alienRegistrationNumber: alienRegistrationNumber.trim(),
          },
          educationDetails: {
            highestQualification,
            institution: institution.trim(),
            fieldOfStudy: fieldOfStudy.trim(),
            graduationYear,
            foreignDegreeEvaluated,
            degreeEvaluationAgency: degreeEvaluationAgency.trim(),
          },
          employmentDetails: {
            currentEmployer: currentEmployer.trim(),
            jobTitle: jobTitle.trim(),
            annualSalary,
            workLocationCity: workLocationCity.trim(),
            workLocationState: workLocationState.trim(),
            yearsOfExperience,
            dutiesSummary: dutiesSummary.trim(),
          },
          categorySpecificDetails: getCategorySpecificPayload(),
          concurrencyVersion,
        };

        if (applicationId) {
          const res = await apiClient.saveApplicationDraft(applicationId, payload);
          if (res.success) {
            setConcurrencyVersion(res.concurrencyVersion || concurrencyVersion + 1);
            setSaveStatus('saved');
            const now = new Date();
            setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            if (manual) setSuccessMessage('Draft saved successfully to MongoDB Atlas.');
          }
        } else if (fullName.trim()) {
          // Create initial record on first save
          const res = await apiClient.createApplication(payload);
          if (res.success && res.application) {
            setApplicationId(res.application._id);
            setConcurrencyVersion(res.application.concurrencyVersion || 1);
            if (res.application.checklist) setChecklist(res.application.checklist);
            setSaveStatus('saved');
            const now = new Date();
            setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            if (manual) setSuccessMessage('Application initialized in MongoDB Atlas.');
          }
        } else {
          setSaveStatus('idle');
        }
      } catch (err) {
        setSaveStatus('error');
        if (manual) setErrorMessage(err instanceof Error ? err.message : 'Failed to save draft.');
      }
    },
    [
      applicationId,
      concurrencyVersion,
      selectedVisa,
      currentStep,
      fullName,
      dateOfBirth,
      nationality,
      email,
      phone,
      currentImmigrationStatus,
      alienRegistrationNumber,
      highestQualification,
      institution,
      fieldOfStudy,
      graduationYear,
      foreignDegreeEvaluated,
      degreeEvaluationAgency,
      currentEmployer,
      jobTitle,
      annualSalary,
      workLocationCity,
      workLocationState,
      yearsOfExperience,
      dutiesSummary,
      getCategorySpecificPayload,
    ]
  );

  // Auto-Save Debounce Effect
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isInitializing || !fullName.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      executeDraftSave(false);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    executeDraftSave,
    isInitializing,
    fullName,
    selectedVisa,
    currentStep,
    jobTitle,
    currentEmployer,
    institution,
  ]);

  // Step Validation & Forward Navigation
  const handleNext = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (currentStep === 1 && !selectedVisa) {
      setErrorMessage('Please choose a target visa classification.');
      return;
    }
    if (currentStep === 2 && !fullName.trim()) {
      setErrorMessage('Please provide the candidate’s full legal name as it appears on their passport.');
      return;
    }
    if (currentStep === 3 && !highestQualification) {
      setErrorMessage('Please specify highest academic qualification.');
      return;
    }

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Final Dossier Initialization (Step 6)
  const handleFinalSubmit = async () => {
    setErrorMessage(null);
    setIsSubmittingFinal(true);
    try {
      const payload = {
        status: 'in_progress',
        currentStep: 6,
        draftStep: 6,
        title: `${fullName.trim()} - ${selectedVisa} Petition`,
        applicantDetails: {
          fullName: fullName.trim(),
          dateOfBirth,
          nationality: nationality.trim(),
          email: email.trim(),
          phone: phone.trim(),
          currentImmigrationStatus,
          alienRegistrationNumber: alienRegistrationNumber.trim(),
        },
        educationDetails: {
          highestQualification,
          institution: institution.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          graduationYear,
          foreignDegreeEvaluated,
          degreeEvaluationAgency: degreeEvaluationAgency.trim(),
        },
        employmentDetails: {
          currentEmployer: currentEmployer.trim(),
          jobTitle: jobTitle.trim(),
          annualSalary,
          workLocationCity: workLocationCity.trim(),
          workLocationState: workLocationState.trim(),
          yearsOfExperience,
          dutiesSummary: dutiesSummary.trim(),
        },
        categorySpecificDetails: getCategorySpecificPayload(),
      };

      let finalApp: ApplicationRecord;
      if (applicationId) {
        const res = await apiClient.updateApplication(applicationId, payload);
        finalApp = res.application;
      } else {
        const res = await apiClient.createApplication({
          ...payload,
          visaCategory: selectedVisa,
        });
        finalApp = res.application;
      }

      setSubmittedApplication(finalApp);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to finalize application.');
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  // Add Custom Checklist Item
  const handleAddCustomChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomLabel.trim() || !applicationId) return;
    try {
      const res = await apiClient.addCustomChecklistItem(applicationId, {
        label: newCustomLabel.trim(),
        section: newCustomSection.trim() || 'Additional Exhibits',
        required: newCustomRequired,
      });
      if (res.success && res.checklist) {
        setChecklist(res.checklist);
        setCustomItemModalOpen(false);
        setNewCustomLabel('');
        setSuccessMessage('Custom evidence requirement added.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add custom checklist item.');
    }
  };

  // Toggle Checklist Item
  const handleToggleItem = async (itemId: string, currentVal: boolean) => {
    if (!applicationId) return;
    const updated = !currentVal;
    // Optimistic
    setChecklist((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isCompleted: updated } : i))
    );
    try {
      const res = await apiClient.toggleChecklistItem(applicationId, itemId, updated);
      if (res.success && res.checklist) {
        setChecklist(res.checklist);
      }
    } catch (err) {
      // Revert
      setChecklist((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, isCompleted: currentVal } : i))
      );
    }
  };

  // Visa Options Metadata
  const visaMetadata = [
    {
      id: 'H-1B' as VisaCategory,
      code: 'H-1B',
      title: 'Specialty Occupation Petition',
      explanation: 'For professionals holding at least a Bachelor’s degree in a specific specialty occupation with a certified DOL Labor Condition Application.',
      evidenceCategories: ['Certified LCA (ETA-9035)', 'Academic Degree & Evaluation', 'Specialty Occupation Duties Breakdown', 'Employer Support Letter'],
      requiredApplicantInfo: ['Candidate Passport Bio', 'Degree Transcripts', 'Specialty Syllabus Matrix', 'Work History & Resume'],
      estimatedPrepSteps: '4 Key Preparation Phases (LCA Certification → Credential Evaluation → Employer Verification → Exhibit Assembly)',
      badge: 'Employer-Sponsored',
      color: '#172B4D',
      icon: Briefcase,
    },
    {
      id: 'O-1' as VisaCategory,
      code: 'O-1A / O-1B',
      title: 'Extraordinary Ability in Science or Business',
      explanation: 'For candidates demonstrating sustained national or international acclaim across sciences, business, arts, or education.',
      evidenceCategories: ['Peer Advisory Opinion', 'Scholarly Articles & Citations', 'Original Scientific Contributions', 'Critical Employment Capacity'],
      requiredApplicantInfo: ['Curriculum Vitae', 'Peer Reference Contacts', 'High Remuneration Evidence', 'Media & Press Clippings'],
      estimatedPrepSteps: '5 Key Preparation Phases (Criteria Selection → Testimonial Letters → Metric Verification → Advisory Review → Dossier Indexing)',
      badge: 'High Evidentiary Standard',
      color: '#426B91',
      icon: Sparkles,
    },
    {
      id: 'EB-2' as VisaCategory,
      code: 'EB-2',
      title: 'Advanced Degree Professional / Exceptional Ability',
      explanation: 'Second preference employment-based immigrant visa requiring an advanced degree or exceptional ability plus approved PERM labor certification.',
      evidenceCategories: ['Approved PERM (ETA-9089)', 'Master’s / Ph.D. Records', '5+ Years Progressive Experience', 'Form I-140 Immigrant Petition'],
      requiredApplicantInfo: ['Official Transcripts', 'Prior Employer Verification Letters', 'PERM Filing Confirmation', 'Job Description Matrix'],
      estimatedPrepSteps: '4 Key Preparation Phases (PERM Proof → Academic Equivalence → Experience Letters → I-140 Filing Packet)',
      badge: 'PERM Track',
      color: '#2E7D32',
      icon: GraduationCap,
    },
    {
      id: 'EB-2-NIW' as VisaCategory,
      code: 'EB-2 NIW',
      title: 'National Interest Waiver (Matter of Dhanasar)',
      explanation: 'Self-petition or sponsored green card waiving job offer and PERM requirement under the 3-prong Dhanasar legal framework.',
      evidenceCategories: ['Prong 1: Substantial Merit Brief', 'Prong 2: Well-Positioned Track Record', 'Prong 3: Balance of National Benefits', '5-8 Expert Letters'],
      requiredApplicantInfo: ['Detailed Proposed Endeavor Plan', 'Citation Record (Google Scholar)', 'Government Grants / Awards', 'Expert Reference Letters'],
      estimatedPrepSteps: '5 Key Preparation Phases (Endeavor Formulation → Expert Testimonials → Citation Analytics → 3-Prong Brief → Exhibit Index)',
      badge: 'Self-Petition Eligible',
      color: '#B78103',
      icon: Scale,
    },
  ];

  const activeVisaData = visaMetadata.find((v) => v.id === selectedVisa) || visaMetadata[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Wizard Header with Auto-Save Badge */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">
              Intelligent Visa Application Builder
            </h1>
            <Badge variant="navy" size="sm">
              {activeVisaData.code}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#627D98]">
            Multi-step structured questionnaire with automated draft saving and USCIS statutory evidence mapping.
          </p>
        </div>

        {/* Auto-Save & Manual Save Controls */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-[#627D98]">
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#172B4D]" />
                <span className="font-medium text-[#172B4D]">Saving draft...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span className="text-[#2E7D32] font-medium">
                  Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
                </span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-[#C62828]" />
                <span className="text-[#C62828] font-medium">Auto-save error</span>
              </>
            )}
            {saveStatus === 'idle' && (
              <span className="text-[#829AB1]">All edits synced</span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => executeDraftSave(true)}
            disabled={saveStatus === 'saving'}
            className="space-x-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FFF5F5] border border-[#FFCDD2] rounded-lg text-xs text-[#C62828] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#166534] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold">×</button>
        </div>
      )}

      {/* Stepper Progress Bar (6 Steps) */}
      {!submittedApplication && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[620px]">
            {[
              { num: 1, label: 'Visa Category' },
              { num: 2, label: 'Applicant Details' },
              { num: 3, label: 'Education & Jobs' },
              { num: 4, label: 'Visa Specifics' },
              { num: 5, label: 'Evidence Checklist' },
              { num: 6, label: 'Review & Save' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <div key={step.num} className="flex items-center space-x-2">
                  <div
                    onClick={() => setCurrentStep(step.num)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#172B4D] text-white ring-4 ring-[#172B4D]/10'
                        : isPast
                        ? 'bg-[#2E7D32] text-white'
                        : 'bg-[#F0F4F8] text-[#829AB1] hover:bg-[#D9E2EC]'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <div>
                    <span
                      onClick={() => setCurrentStep(step.num)}
                      className={`text-xs font-semibold cursor-pointer block whitespace-nowrap ${
                        isActive ? 'text-[#172B4D]' : isPast ? 'text-[#2E7D32]' : 'text-[#829AB1]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {step.num < 6 && (
                    <div className="w-6 md:w-10 h-px bg-[#CBD5E1] mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: Visa Category Selection */}
      {currentStep === 1 && !submittedApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Employment or Talent Visa Category</CardTitle>
            <CardDescription>
              Choose your petition classification. Evidence structures, statutory checklists, and legal arguments will adapt automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visaMetadata.map((meta) => {
                const Icon = meta.icon;
                const isSelected = selectedVisa === meta.id;

                return (
                  <div
                    key={meta.id}
                    onClick={() => setSelectedVisa(meta.id)}
                    className={`p-5 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#172B4D] bg-[#FAFCFF] shadow-xs'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="p-2 rounded text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <Badge variant="navy" size="sm">
                          {meta.badge}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-sm text-[#172B4D] mb-1">
                        {meta.title} ({meta.code})
                      </h3>
                      <p className="text-xs text-[#627D98] leading-relaxed mb-3">
                        {meta.explanation}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                        <div>
                          <span className="text-[10px] font-bold text-[#426B91] uppercase tracking-wider block">
                            Key Evidence Categories
                          </span>
                          <p className="text-[11px] text-[#486581] mt-0.5">
                            {meta.evidenceCategories.join(' • ')}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#426B91] uppercase tracking-wider block">
                            Preparation Path
                          </span>
                          <p className="text-[11px] text-[#627D98] mt-0.5">
                            {meta.estimatedPrepSteps}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                      <span className="text-[#829AB1] font-mono text-[11px]">
                        Statutory Mapping Active
                      </span>
                      <Button
                        size="sm"
                        variant={isSelected ? 'primary' : 'outline'}
                        className="text-xs"
                      >
                        {isSelected ? '✓ Selected' : 'Start Application'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/dashboard/applications">
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button size="sm" onClick={handleNext} className="space-x-1.5">
              <span>Continue to Applicant Details</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: Applicant Details */}
      {currentStep === 2 && !submittedApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Beneficiary Personal &amp; Immigration Profile</CardTitle>
            <CardDescription>
              Biographical data required on standard USCIS petition filings (Form I-129 / Form I-140).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Full Legal Name <span className="text-[#C62828]">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Siddharth Rao"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  required
                />
                <p className="text-[11px] text-[#829AB1]">Exact name matching passport biographical page.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Country of Citizenship / Nationality
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. India, Canada, Germany, Brazil"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Contact Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Current U.S. Immigration Status
                </label>
                <select
                  value={currentImmigrationStatus}
                  onChange={(e) => setCurrentImmigrationStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                >
                  <option value="H-1B">H-1B Specialty Occupation</option>
                  <option value="F-1_OPT">F-1 Student (OPT / STEM OPT)</option>
                  <option value="O-1">O-1 Extraordinary Ability</option>
                  <option value="L-1">L-1 Intra-company Transferee</option>
                  <option value="TN">TN NAFTA Professional</option>
                  <option value="B-1_B-2">B-1 / B-2 Visitor</option>
                  <option value="Abroad">Outside U.S. (Consular Processing)</option>
                  <option value="Other">Other Status</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">
                  Alien Registration Number (A-Number)
                </label>
                <input
                  type="text"
                  value={alienRegistrationNumber}
                  onChange={(e) => setAlienRegistrationNumber(e.target.value)}
                  placeholder="e.g. A-123456789 (If assigned)"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleBack} className="space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <Button size="sm" onClick={handleNext} disabled={!fullName.trim()} className="space-x-1.5">
              <span>Continue to Education &amp; Work</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: Education & Employment */}
      {currentStep === 3 && !submittedApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Academic Credentials &amp; Employment History</CardTitle>
            <CardDescription>
              Detail your educational achievements and current professional engagement for USCIS review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {/* Academic Credentials */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider border-b border-[#F1F5F9] pb-1.5">
                Highest Academic Qualification
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Degree Level</label>
                  <select
                    value={highestQualification}
                    onChange={(e) => setHighestQualification(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  >
                    <option value="Doctoral Degree (Ph.D.)">Doctoral Degree (Ph.D.)</option>
                    <option value="Master's Degree">Master's Degree (M.S. / M.A.)</option>
                    <option value="Bachelor's Degree">Bachelor's Degree (B.S. / B.A.)</option>
                    <option value="Foreign Advanced Degree">Foreign Advanced Degree</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Institution / University</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Field of Study / Major</label>
                  <input
                    type="text"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Computer Science, Biotechnology"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={foreignDegreeEvaluated}
                    onChange={(e) => setForeignDegreeEvaluated(e.target.checked)}
                    className="rounded border-[#CBD5E1] text-[#172B4D]"
                  />
                  <span className="text-[#172B4D]">Foreign academic credentials evaluated by NACES-member agency</span>
                </label>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider border-b border-[#F1F5F9] pb-1.5">
                Current Position &amp; Employer
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Sponsoring Organization / Employer</label>
                  <input
                    type="text"
                    value={currentEmployer}
                    onChange={(e) => setCurrentEmployer(e.target.value)}
                    placeholder="e.g. Nexus AI Laboratories Inc."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Job Title / Professional Role</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Distributed Systems Engineer"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Annual Salary (USD)</label>
                  <input
                    type="text"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(e.target.value)}
                    placeholder="e.g. 165000"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Work City</label>
                  <input
                    type="text"
                    value={workLocationCity}
                    onChange={(e) => setWorkLocationCity(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Work State</label>
                  <input
                    type="text"
                    value={workLocationState}
                    onChange={(e) => setWorkLocationState(e.target.value)}
                    placeholder="e.g. CA"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#172B4D]">Summary of Core Job Duties</label>
                <textarea
                  value={dutiesSummary}
                  onChange={(e) => setDutiesSummary(e.target.value)}
                  placeholder="Describe primary responsibilities demonstrating theoretical and practical application of highly specialized knowledge..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-20"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleBack} className="space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <Button size="sm" onClick={handleNext} className="space-x-1.5">
              <span>Continue to Visa Specifics</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: Visa-Specific Information (Subphase 4.5) */}
      {currentStep === 4 && !submittedApplication && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CardTitle>Step 4: {selectedVisa} Evidentiary Questionnaire</CardTitle>
              <Badge variant="navy">{selectedVisa}</Badge>
            </div>
            <CardDescription>
              Tailored statutory requirements under USCIS regulatory standards for {activeVisaData.title}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {/* H-1B Specific */}
            {selectedVisa === 'H-1B' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-[#486581]">
                  <strong>H-1B Labor Compliance:</strong> DOL certified Form ETA-9035 is required before filing Form I-129.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#172B4D]">LCA ETA-9035 Case Number</label>
                    <input
                      type="text"
                      value={lcaNumber}
                      onChange={(e) => setLcaNumber(e.target.value)}
                      placeholder="e.g. I-200-24123-987654"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#172B4D]">SOC (Standard Occupational Classification) Code</label>
                    <input
                      type="text"
                      value={socCode}
                      onChange={(e) => setSocCode(e.target.value)}
                      placeholder="e.g. 15-1252 (Software Developers)"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Specialty Occupation Justification</label>
                  <textarea
                    value={specialtyOccupationArgument}
                    onChange={(e) => setSpecialtyOccupationArgument(e.target.value)}
                    placeholder="Explain why the position requires a theoretical and practical application of a body of highly specialized knowledge and at least a Bachelor's degree in a specific specialty..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-24"
                  />
                </div>
              </div>
            )}

            {/* O-1 Specific */}
            {selectedVisa === 'O-1' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-[#486581]">
                  <strong>8 CFR 214.2(o) Criteria:</strong> Candidate must demonstrate sustained acclaim by satisfying at least 3 of 8 evidentiary categories or a major award.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#172B4D] block">
                    Select Evidentiary Criteria Claimed
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'awards', label: 'Nationally / Internationally Recognized Awards' },
                      { id: 'memberships', label: 'Memberships in Associations Requiring Outstanding Achievement' },
                      { id: 'media', label: 'Published Material About Applicant in Major Media' },
                      { id: 'judging', label: 'Judging the Work of Peers in the Field' },
                      { id: 'original_contributions', label: 'Original Scientific, Scholarly, or Business Contributions' },
                      { id: 'authorship', label: 'Authorship of Scholarly Articles in Professional Journals' },
                      { id: 'critical_role', label: 'Critical or Essential Role for Distinguished Organizations' },
                      { id: 'high_remuneration', label: 'High Remuneration / Salary Relative to Others' },
                    ].map((crit) => (
                      <label key={crit.id} className="flex items-center space-x-2 p-2 border border-[#E2E8F0] rounded bg-white cursor-pointer hover:bg-[#F8FAFC]">
                        <input
                          type="checkbox"
                          checked={o1CriteriaMet.includes(crit.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setO1CriteriaMet([...o1CriteriaMet, crit.id]);
                            } else {
                              setO1CriteriaMet(o1CriteriaMet.filter((c) => c !== crit.id));
                            }
                          }}
                          className="rounded text-[#172B4D]"
                        />
                        <span className="text-[#172B4D] font-medium">{crit.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Summary of Sustained National / International Acclaim</label>
                  <textarea
                    value={o1AchievementsSummary}
                    onChange={(e) => setO1AchievementsSummary(e.target.value)}
                    placeholder="Highlight primary contributions, citations, software benchmarks, patents, and keynote presentations..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-20"
                  />
                </div>
              </div>
            )}

            {/* EB-2 Specific */}
            {selectedVisa === 'EB-2' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#172B4D]">EB-2 Eligibility Track</label>
                    <select
                      value={eb2SubCategory}
                      onChange={(e) => setEb2SubCategory(e.target.value as 'advanced_degree' | 'exceptional_ability')}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    >
                      <option value="advanced_degree">Advanced Degree Professional (Master's or Bachelor's + 5 yrs)</option>
                      <option value="exceptional_ability">Exceptional Ability in the Sciences, Arts, or Business</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#172B4D]">PERM Labor Cert Number (ETA-9089)</label>
                    <input
                      type="text"
                      value={permCaseNumber}
                      onChange={(e) => setPermCaseNumber(e.target.value)}
                      placeholder="e.g. A-21000-12345"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Progressive Experience Verification Overview</label>
                  <textarea
                    value={progressiveExperienceLetters}
                    onChange={(e) => setProgressiveExperienceLetters(e.target.value)}
                    placeholder="List past employers providing experience verification letters certifying 5+ years of progressive post-baccalaureate experience..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-20"
                  />
                </div>
              </div>
            )}

            {/* EB-2 NIW Specific */}
            {selectedVisa === 'EB-2-NIW' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#FFF8E1] border border-[#FFE082] rounded text-xs text-[#795548]">
                  <strong>Matter of Dhanasar (26 I&amp;N Dec. 884):</strong> The legal brief must establish all three prongs to waive the employer job offer and DOL PERM labor certification.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Proposed Endeavor Title</label>
                  <input
                    type="text"
                    value={proposedEndeavorTitle}
                    onChange={(e) => setProposedEndeavorTitle(e.target.value)}
                    placeholder="e.g. Advancing High-Throughput Clean Hydrogen Fuel Cell Architecture"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Prong 1: Substantial Merit &amp; National Importance</label>
                  <textarea
                    value={prong1SubstantialMerit}
                    onChange={(e) => setProng1SubstantialMerit(e.target.value)}
                    placeholder="Explain how the proposed endeavor holds substantial merit and broad national implications for US clean energy, economic competitiveness, or public health..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Prong 2: Evidence Applicant is Well-Positioned</label>
                  <textarea
                    value={prong2WellPositioned}
                    onChange={(e) => setProng2WellPositioned(e.target.value)}
                    placeholder="Detail past track record, citation counts, grant funding, intellectual property, and peer endorsements..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#172B4D]">Prong 3: Balance of U.S. National Interest</label>
                  <textarea
                    value={prong3NationalImportance}
                    onChange={(e) => setProng3NationalImportance(e.target.value)}
                    placeholder="Demonstrate that the urgency, national scope, or nature of the endeavor makes the traditional PERM labor certification impractical or contrary to US interests..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D] h-20"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleBack} className="space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <Button size="sm" onClick={handleNext} className="space-x-1.5">
              <span>Continue to Evidence Checklist</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: Evidence Checklist (Subphase 4.8) */}
      {currentStep === 5 && !submittedApplication && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Step 5: Statutory Evidence Checklist</CardTitle>
                <CardDescription>
                  Preview mandatory and conditional exhibits initialized for {selectedVisa}. Check off completed exhibits or add custom requirements.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomItemModalOpen(true)}
                className="space-x-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Exhibit</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {customItemModalOpen && (
              <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#172B4D]">Add Custom Evidentiary Requirement</h4>
                  <button onClick={() => setCustomItemModalOpen(false)} className="text-xs font-bold text-[#627D98]">×</button>
                </div>
                <form onSubmit={handleAddCustomChecklistItem} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#172B4D] block">Exhibit Label</label>
                      <input
                        type="text"
                        value={newCustomLabel}
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        placeholder="e.g. Expert Letter from Stanford Dean"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#172B4D] block">Section Category</label>
                      <input
                        type="text"
                        value={newCustomSection}
                        onChange={(e) => setNewCustomSection(e.target.value)}
                        placeholder="e.g. Peer Testimonials"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={newCustomRequired}
                        onChange={(e) => setNewCustomRequired(e.target.checked)}
                        className="rounded text-[#172B4D]"
                      />
                      <span>Mark as mandatory exhibit</span>
                    </label>
                    <div className="space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCustomItemModalOpen(false)}>Cancel</Button>
                      <Button type="submit" size="sm">Save Requirement</Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-2">
              {checklist.length > 0 ? (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id, item.isCompleted)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 ${
                      item.isCompleted ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-[#2E7D32]"
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#172B4D]">
                          {item.label}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {item.isCustom && <Badge variant="neutral" size="sm">Custom</Badge>}
                          <Badge variant={item.required ? 'navy' : 'neutral'} size="sm">
                            {item.required ? 'Required' : 'Conditional'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#627D98]">{item.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-[#829AB1] space-y-2">
                  <FileText className="w-6 h-6 mx-auto text-[#CBD5E1]" />
                  <p>Checklist will automatically initialize upon first saving the candidate record.</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleBack} className="space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <Button size="sm" onClick={handleNext} className="space-x-1.5">
              <span>Proceed to Review &amp; Finalize</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 6: Review & Finalize */}
      {currentStep === 6 && !submittedApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Comprehensive Dossier Verification &amp; Initialization</CardTitle>
            <CardDescription>
              Review all entered information across biographical, professional, and visa-specific questionnaires before committing to MongoDB Atlas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {/* Summary Sections with Quick Edit buttons */}
            <div className="space-y-4 text-xs">
              {/* Category */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#172B4D]" />
                    <span className="font-bold text-[#172B4D]">Visa Classification</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="h-6 text-[11px] space-x-1">
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[#486581]">
                  <div><span className="font-semibold text-[#172B4D]">Category:</span> {activeVisaData.title} ({selectedVisa})</div>
                  <div><span className="font-semibold text-[#172B4D]">Sponsorship:</span> {activeVisaData.badge}</div>
                </div>
              </div>

              {/* Applicant */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#172B4D]" />
                    <span className="font-bold text-[#172B4D]">Applicant Personal Profile</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="h-6 text-[11px] space-x-1">
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[#486581]">
                  <div><span className="font-semibold text-[#172B4D]">Name:</span> {fullName || 'Not provided'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Nationality:</span> {nationality || 'Not provided'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Current Status:</span> {currentImmigrationStatus}</div>
                  <div><span className="font-semibold text-[#172B4D]">Email:</span> {email || 'Not provided'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Phone:</span> {phone || 'Not provided'}</div>
                  <div><span className="font-semibold text-[#172B4D]">A-Number:</span> {alienRegistrationNumber || 'None'}</div>
                </div>
              </div>

              {/* Education & Employment */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-[#172B4D]" />
                    <span className="font-bold text-[#172B4D]">Education &amp; Employment</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="h-6 text-[11px] space-x-1">
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[#486581]">
                  <div><span className="font-semibold text-[#172B4D]">Highest Degree:</span> {highestQualification}</div>
                  <div><span className="font-semibold text-[#172B4D]">Institution:</span> {institution || 'Not provided'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Employer:</span> {currentEmployer || 'Self-Petition'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Job Title:</span> {jobTitle || 'Beneficiary'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Salary:</span> {annualSalary ? `$${annualSalary}` : 'Not provided'}</div>
                  <div><span className="font-semibold text-[#172B4D]">Location:</span> {workLocationCity && workLocationState ? `${workLocationCity}, ${workLocationState}` : 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Legaltech Disclaimer */}
            <div className="p-3.5 bg-[#FFF8E1] border border-[#FFE082] rounded-lg text-xs text-[#795548] space-y-1">
              <span className="font-bold text-[#B78103]">Statutory Preparation Notice</span>
              <p className="leading-relaxed">
                Initializing this dossier creates the master case in MongoDB Atlas. Completed checklist items and uploaded exhibits serve as preparation records and do not constitute formal legal advice or guarantees of USCIS adjudication.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={handleBack} className="space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeDraftSave(true)}
                disabled={isSubmittingFinal}
                className="space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </Button>
              <Button
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isSubmittingFinal}
                className="space-x-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
              >
                {isSubmittingFinal ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Initializing in Atlas...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Initialize Dossier Workspace</span>
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Success Confirmation Modal */}
      {submittedApplication && (
        <Card className="border-t-4 border-t-[#2E7D32] text-center p-8 space-y-4">
          <div className="w-12 h-12 bg-[#E8F5E9] text-[#2E7D32] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#172B4D]">
              Visa Dossier Initialized in MongoDB Atlas
            </h2>
            <p className="text-xs text-[#627D98] max-w-md mx-auto mt-2 leading-relaxed">
              Case record created for <strong className="text-[#172B4D]">{fullName}</strong> under classification <strong className="text-[#172B4D]">{selectedVisa}</strong>.
            </p>
            <p className="text-[11px] text-[#829AB1] font-mono mt-1">
              Case ID: {submittedApplication._id}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/dashboard/applications/${submittedApplication._id}`}>
              <Button variant="primary" size="sm" className="space-x-1.5">
                <span>Open Dossier &amp; Checklist</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/documents?id=${submittedApplication._id}`}>
              <Button variant="outline" size="sm" className="space-x-1.5">
                <FileText className="w-4 h-4" />
                <span>Upload Exhibits</span>
              </Button>
            </Link>
            <Link href="/dashboard/applications">
              <Button variant="ghost" size="sm">
                View All Cases
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function CreateApplicationPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[#627D98]">Loading application wizard...</div>}>
      <ApplicationWizardContent />
    </Suspense>
  );
}
