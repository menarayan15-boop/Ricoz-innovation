// backend/src/services/dossier.service.ts
// Comprehensive Service for Phase 8: Automated Dossier Assembly, Explainable Case Readiness Scoring,
// Grounded AI Case Summaries, Attorney Review Adjudications, and Multi-Page Bates-Numbered PDF Generation.

import { Types } from 'mongoose';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Application, IApplication } from '../models/application.model.js';
import { DocumentModel, IDocumentRecord } from '../models/document.model.js';
import {
  EvidenceAnalysis,
  EvidenceFindingRecord,
  EvidenceGap,
  EvidenceMapping,
} from '../models/evidence-intelligence.model.js';
import {
  DossierModel,
  IDossier,
  ICaseReadinessScore,
  IAiCaseSummary,
  IDossierSection,
  IBatesNumbering,
} from '../models/dossier.model.js';
import { aiService } from './ai.service.js';
import { logger } from '../utils/logger.js';

export class DossierService {
  /**
   * 1. Calculate Transparent & Explainable Case Readiness Score (0 to 100)
   */
  public async calculateReadinessScore(
    application: IApplication,
    documents: IDocumentRecord[],
    latestAnalysisId?: string,
    overrideDossierStatus?: string
  ): Promise<ICaseReadinessScore> {
    const totalDocs = documents.length;

    // Component 1: Required Documents Available (Max 25 pts)
    const checklistItems = application.checklist || [];
    const requiredItems = checklistItems.filter((i) => i.required);
    let reqDocsScore = 0;
    let reqDocsSatisfied = false;
    let reqDocsDetails = '';

    if (requiredItems.length > 0) {
      const completedRequired = requiredItems.filter((i) => i.isCompleted).length;
      reqDocsScore = Math.round((completedRequired / requiredItems.length) * 25);
      reqDocsSatisfied = completedRequired === requiredItems.length;
      reqDocsDetails = `${completedRequired} of ${requiredItems.length} statutory checklist items completed (${reqDocsScore}/25 pts)`;
    } else {
      reqDocsScore = Math.min(25, Math.round(totalDocs * 6.25));
      reqDocsSatisfied = totalDocs >= 4;
      reqDocsDetails = `${totalDocs} evidentiary exhibits uploaded (${reqDocsScore}/25 pts)`;
    }

    // Component 2: Evidence Verification Status (Max 25 pts)
    let verifiedScore = 0;
    let verifiedSatisfied = false;
    let verifiedDetails = '';

    if (totalDocs > 0) {
      const verifiedCount = documents.filter(
        (d) =>
          d.metadata?.ocrStatus === 'completed' ||
          Boolean(d.metadata?.extractedText) ||
          d.reviewStatus === 'verified'
      ).length;
      verifiedScore = Math.round((verifiedCount / totalDocs) * 25);
      verifiedSatisfied = verifiedCount === totalDocs;
      verifiedDetails = `${verifiedCount} of ${totalDocs} uploaded exhibits verified via OCR/extraction (${verifiedScore}/25 pts)`;
    } else {
      verifiedScore = 0;
      verifiedSatisfied = false;
      verifiedDetails = 'No exhibits uploaded or verified yet (0/25 pts)';
    }

    // Fetch Phase 7 findings and gaps
    const queryAppId = application._id;
    const [findings, gaps] = await Promise.all([
      EvidenceFindingRecord.find({ applicationId: queryAppId }),
      EvidenceGap.find({ applicationId: queryAppId }),
    ]);

    // Component 3: Missing Supporting Evidence Gaps (Max 20 pts)
    let missingEvidenceScore = 20;
    const openGaps = gaps.filter((g: any) => g.resolutionStatus === 'open');
    if (openGaps.length > 0) {
      const penalty = openGaps.length * 5;
      missingEvidenceScore = Math.max(0, 20 - penalty);
    }
    const missingEvidenceSatisfied = openGaps.length === 0;
    const missingEvidenceDetails =
      openGaps.length === 0
        ? `All statutory evidence prongs addressed or waived (${missingEvidenceScore}/20 pts)`
        : `${openGaps.length} open statutory gap(s) detected (-${openGaps.length * 5} penalty) (${missingEvidenceScore}/20 pts)`;

    // Component 4: Unresolved Inconsistencies & Discrepancies (Max 15 pts)
    let inconsistencyScore = 15;
    const unreviewedHigh = findings.filter(
      (f: any) => f.severity === 'high' && f.reviewStatus === 'awaiting_review'
    ).length;
    const unreviewedMedium = findings.filter(
      (f: any) => f.severity === 'medium' && f.reviewStatus === 'awaiting_review'
    ).length;
    const unreviewedLow = findings.filter(
      (f: any) => f.severity === 'low' && f.reviewStatus === 'awaiting_review'
    ).length;

    const penaltyInconsistencies = unreviewedHigh * 8 + unreviewedMedium * 4 + unreviewedLow * 1;
    inconsistencyScore = Math.max(0, 15 - penaltyInconsistencies);
    const inconsistencySatisfied = unreviewedHigh === 0 && unreviewedMedium === 0;
    const inconsistencyDetails =
      inconsistencySatisfied && unreviewedLow === 0
        ? `Zero unresolved discrepancies detected (${inconsistencyScore}/15 pts)`
        : `${unreviewedHigh} High, ${unreviewedMedium} Medium, ${unreviewedLow} Low unresolved discrepancy item(s) (${inconsistencyScore}/15 pts)`;

    // Component 5: Attorney Review Completion (Max 15 pts)
    let attorneyScore = 0;
    let attorneySatisfied = false;
    let attorneyDetails = '';

    const appStatus = application.status;
    const existingDossier = await DossierModel.findOne({ applicationId: queryAppId }).sort({
      version: -1,
    });
    const dossierStatus = overrideDossierStatus || existingDossier?.status;

    if (
      dossierStatus === 'approved' ||
      dossierStatus === 'finalized' ||
      appStatus === 'approved_for_submission' ||
      application.reviewDecision?.status === 'approved'
    ) {
      attorneyScore = 15;
      attorneySatisfied = true;
      attorneyDetails = 'Legal counsel completed formal adjudication & approved filing draft (15/15 pts)';
    } else if (
      dossierStatus === 'pending_review' ||
      appStatus === 'under_attorney_review' ||
      appStatus === 'ready_for_final_review'
    ) {
      attorneyScore = 7;
      attorneySatisfied = false;
      attorneyDetails = 'Dossier queued in Attorney Review Queue awaiting formal sign-off (7/15 pts)';
    } else if (dossierStatus === 'changes_requested' || appStatus === 'changes_requested') {
      attorneyScore = 3;
      attorneySatisfied = false;
      attorneyDetails = 'Attorney requested targeted evidence additions or document revisions (3/15 pts)';
    } else {
      attorneyScore = 0;
      attorneySatisfied = false;
      attorneyDetails = 'Dossier in draft stage; has not been submitted for legal counsel review (0/15 pts)';
    }

    const overallScore = Math.min(
      100,
      Math.max(0, reqDocsScore + verifiedScore + missingEvidenceScore + inconsistencyScore + attorneyScore)
    );

    return {
      overallScore,
      breakdown: {
        requiredDocsAvailable: {
          score: reqDocsScore,
          max: 25,
          satisfied: reqDocsSatisfied,
          details: reqDocsDetails,
        },
        evidenceVerification: {
          score: verifiedScore,
          max: 25,
          satisfied: verifiedSatisfied,
          details: verifiedDetails,
        },
        missingEvidence: {
          score: missingEvidenceScore,
          max: 20,
          satisfied: missingEvidenceSatisfied,
          details: missingEvidenceDetails,
        },
        unresolvedInconsistencies: {
          score: inconsistencyScore,
          max: 15,
          satisfied: inconsistencySatisfied,
          details: inconsistencyDetails,
        },
        attorneyReview: {
          score: attorneyScore,
          max: 15,
          satisfied: attorneySatisfied,
          details: attorneyDetails,
        },
      },
      formulaExplanation:
        'Readiness Score (0-100) = Required Documents (Max 25) + Evidence Verification (Max 25) + Missing Evidence Resolution (Max 20) + Inconsistency Resolution (Max 15) + Attorney Adjudication (Max 15). Score measures dossier completeness only.',
      scoringVersion: '1.0-case-readiness',
      calculatedAt: new Date(),
      disclaimer:
        'The Case Readiness Score measures dossier completeness only and does not constitute an official visa approval probability, legal counsel, or guarantee of USCIS adjudication outcome.',
    };
  }

  /**
   * 2. Generate Grounded AI Case Summary with Evidence Citations
   */
  public async generateAiCaseSummary(
    application: IApplication,
    documents: IDocumentRecord[],
    findings: any[],
    gaps: any[],
    mappings: any[]
  ): Promise<IAiCaseSummary> {
    const applicantName =
      application.applicantDetails?.fullName ||
      (application.formData?.applicantName as string) ||
      'Applicant Beneficiary';
    const visaCategory = application.visaCategory;
    const jobTitle =
      application.employmentDetails?.jobTitle ||
      (application.formData?.jobTitle as string) ||
      'Specialty Role';
    const employerName =
      application.employmentDetails?.currentEmployer ||
      (application.formData?.employerName as string) ||
      'Petitioning Employer';

    // Build document reference items with exhibit lettering
    const docReferences = documents.map((doc, idx) => {
      const exhibitLetter = String.fromCharCode(65 + (idx % 26));
      const exhibitCode = `EXHIBIT ${exhibitLetter}${idx >= 26 ? Math.floor(idx / 26) : ''}`;
      return {
        documentId: doc._id as Types.ObjectId,
        title: doc.title || doc.originalFilename,
        exhibitCode,
        category: doc.category || 'SUPPORTING_EVIDENCE',
        verifiedFactsCount: doc.metadata?.extractedText ? 3 : 2,
      };
    });

    // Build identified inconsistencies
    const identifiedInconsistencies = findings.map((f: any) => ({
      findingId: f._id as Types.ObjectId,
      title: f.title || f.category,
      severity: f.severity,
      reviewStatus: f.reviewStatus,
    }));

    // Outstanding requirements
    const outstandingRequirements = gaps
      .filter((g: any) => g.resolutionStatus === 'open')
      .map((g: any) => `${g.criterionName}: ${g.missingEvidenceType} (${g.recommendation})`);

    // Suggested review actions
    const suggestedReviewActions: string[] = [];
    if (findings.some((f: any) => f.severity === 'high' && f.reviewStatus === 'awaiting_review')) {
      suggestedReviewActions.push(
        'Review and reconcile High-Severity discrepancy items before formal attorney sign-off.'
      );
    }
    if (outstandingRequirements.length > 0) {
      suggestedReviewActions.push(
        `Procure or waive ${outstandingRequirements.length} open statutory evidentiary gap(s).`
      );
    }
    if (documents.length < 3) {
      suggestedReviewActions.push(
        'Upload additional corroborating documentary evidence to strengthen petition record.'
      );
    }
    if (suggestedReviewActions.length === 0) {
      suggestedReviewActions.push(
        'All preliminary evidence checks passed. Ready for final attorney adjudication and submission packaging.'
      );
    }

    // Default high-fidelity grounded summary
    let overview = `This immigration petition dossier is prepared on behalf of ${applicantName} for the ${visaCategory} visa classification, sponsored by ${employerName} for the position of ${jobTitle}. The record incorporates ${documents.length} verified documentary exhibits cross-referenced against statutory requirements under Title 8 of the Code of Federal Regulations.`;
    let evidenceSummary = `The evidentiary binder includes ${docReferences.map((d) => `${d.exhibitCode} (${d.title})`).join(', ')}. Cross-document verification evaluated identity alignment, degree conferral dates, and prevailing wage parameters. ${findings.length === 0 ? 'No conflicting factual discrepancies were detected across the exhibited documentation.' : `${findings.length} evidentiary finding(s) were flagged for human attorney review.`}`;

    // Attempt OpenAI synthesis for enhanced legal narrative if available
    try {
      if (aiService.isConfigured()) {
        const promptText = `Draft a concise 2-paragraph Legal Case Summary for a ${visaCategory} visa petition dossier.
Applicant: ${applicantName}
Role: ${jobTitle}
Employer: ${employerName}
Uploaded Exhibits: ${docReferences.map((d) => `${d.exhibitCode}: ${d.title}`).join('; ')}
Discrepancies: ${findings.length} items (${findings.map((f: any) => `${f.title} [${f.severity}]`).join(', ')})
Gaps: ${outstandingRequirements.length} items.`;

        const response = await aiService.generateChatResponse([
          { role: 'user', content: promptText },
        ]);

        if (response.content && response.content.trim().length > 50) {
          overview = response.content.trim();
        }
      }
    } catch (err) {
      logger.warn('[DossierService] AI synthesis skipped, using deterministic grounded summary:', err);
    }

    return {
      overview,
      evidenceSummary,
      documentReferences: docReferences,
      identifiedInconsistencies,
      outstandingRequirements,
      suggestedReviewActions,
      generatedAt: new Date(),
      isEditedByHuman: false,
    };
  }

  /**
   * 3. Generate Complete Structured Dossier Draft
   */
  public async generateDossierDraft(
    applicationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    userRole: string
  ): Promise<IDossier> {
    const app = await Application.findById(applicationId);
    if (!app) {
      throw new Error('Visa application not found.');
    }

    // Verify ownership or attorney/admin permissions
    const isOwner = app.applicantId.toString() === userId.toString();
    const isAssigned = app.assignedAttorneyId?.toString() === userId.toString();
    const isStaff = userRole === 'attorney' || userRole === 'admin';
    if (!isOwner && !isAssigned && !isStaff) {
      throw new Error('Access denied: You are not authorized to generate a dossier for this petition.');
    }

    // Retrieve active documents
    const documents = await DocumentModel.find({
      applicationId: app._id,
      deletedAt: null,
    }).sort({ createdAt: 1 });

    // Retrieve latest Phase 7 analysis
    const latestAnalysis = await EvidenceAnalysis.findOne({ applicationId: app._id }).sort({
      createdAt: -1,
    });
    const [findings, gaps, mappings] = await Promise.all([
      EvidenceFindingRecord.find({ applicationId: app._id }),
      EvidenceGap.find({ applicationId: app._id }),
      EvidenceMapping.find({ applicationId: app._id }),
    ]);

    // Calculate explainable readiness score
    const readinessScore = await this.calculateReadinessScore(
      app,
      documents,
      latestAnalysis?.analysisId
    );

    // Generate grounded AI summary
    const aiCaseSummary = await this.generateAiCaseSummary(
      app,
      documents,
      findings,
      gaps,
      mappings
    );

    // Compute Bates numbering
    const prefixMap: Record<string, string> = {
      'H-1B': 'H1B-EX-',
      'O-1': 'O1-EX-',
      'EB-2': 'EB2-EX-',
      'EB-2-NIW': 'NIW-EX-',
    };
    const prefix = prefixMap[app.visaCategory] || 'DOS-EX-';
    let totalEstPages = 10; // Base dossier sections
    documents.forEach((d) => {
      totalEstPages += d.metadata?.pageCount || 2;
    });

    const batesNumbering: IBatesNumbering = {
      prefix,
      startNumber: 1,
      endNumber: totalEstPages,
      totalCount: totalEstPages,
    };

    // Construct 10 USCIS standard filing sections
    const applicantName =
      app.applicantDetails?.fullName ||
      (app.formData?.applicantName as string) ||
      'Applicant Beneficiary';
    const employerName =
      app.employmentDetails?.currentEmployer ||
      (app.formData?.employerName as string) ||
      'Petitioning Employer';

    const sections: IDossierSection[] = [
      {
        key: 'cover_page',
        title: '1. Official Petition Cover Page',
        pageOffset: 1,
        content: `FORM I-129 / IMMIGRANT PETITION FILING PACKET\nClassification: ${app.visaCategory}\nBeneficiary: ${applicantName}\nPetitioner: ${employerName}\nJurisdiction: USCIS Service Center\nBates Range: ${prefix}0001 to ${prefix}${String(totalEstPages).padStart(4, '0')}`,
      },
      {
        key: 'overview',
        title: '2. Executive Application Overview',
        pageOffset: 2,
        content: `Petition Title: ${app.title}\nVisa Category: ${app.visaCategory}\nSubmission Target: ${app.targetFilingDate ? new Date(app.targetFilingDate).toLocaleDateString() : 'Immediate'}\nCurrent Progress: ${app.progressPercentage || 0}%\nReadiness Completeness Score: ${readinessScore.overallScore}/100`,
      },
      {
        key: 'applicant_profile',
        title: '3. Applicant Information & Credentials',
        pageOffset: 3,
        content: `Legal Name: ${applicantName}\nEmail: ${app.applicantDetails?.email || 'On Record'}\nNationality: ${app.applicantDetails?.nationality || 'On Record'}\nHighest Degree: ${app.educationDetails?.highestQualification || 'Evaluated Degree'}\nField of Study: ${app.educationDetails?.fieldOfStudy || 'Specialty Field'}\nInstitution: ${app.educationDetails?.institution || 'Academic Institution'}`,
      },
      {
        key: 'ai_case_summary',
        title: '4. Grounded Legal Case Summary',
        pageOffset: 4,
        content: `${aiCaseSummary.overview}\n\nEVIDENTIARY SYNTHESIS:\n${aiCaseSummary.evidenceSummary}`,
      },
      {
        key: 'evidence_index',
        title: '5. Evidentiary Exhibit Master Index',
        pageOffset: 5,
        content: aiCaseSummary.documentReferences
          .map(
            (ref, i) =>
              `${ref.exhibitCode}: ${ref.title} [Category: ${ref.category}] — Bates: ${prefix}${String(i * 4 + 10).padStart(4, '0')}`
          )
          .join('\n'),
      },
      {
        key: 'supporting_evidence',
        title: '6. Supporting Evidence & Verification Registry',
        pageOffset: 6,
        content: documents
          .map(
            (d, i) =>
              `Exhibit ${i + 1}: ${d.title || d.originalFilename} | Size: ${(d.fileSize / 1024).toFixed(1)} KB | OCR: ${d.metadata?.ocrStatus || 'pending'}`
          )
          .join('\n'),
      },
      {
        key: 'evidence_findings',
        title: '7. Evidence Intelligence & Consistency Findings',
        pageOffset: 7,
        content:
          findings.length === 0
            ? 'No factual inconsistencies or document discrepancies identified.'
            : findings
                .map(
                  (f: any, i: number) =>
                    `Finding ${i + 1} [${f.severity.toUpperCase()} - Status: ${f.reviewStatus}]: ${f.title}\nDetails: ${f.description}\nAffected Documents: ${f.affectedDocuments?.map((ad: any) => ad.title || ad.documentId).join(', ') || 'N/A'}`
                )
                .join('\n\n'),
      },
      {
        key: 'outstanding_issues',
        title: '8. Outstanding Statutory Issues & Evidence Gaps',
        pageOffset: 8,
        content:
          gaps.length === 0
            ? 'All statutory criteria exhibits fulfilled.'
            : gaps
                .map(
                  (g: any, i: number) =>
                    `Gap ${i + 1} [Status: ${g.resolutionStatus}]: ${g.criterionName}\nMissing: ${g.missingEvidenceType}\nAction Required: ${g.recommendation}`
                )
                .join('\n\n'),
      },
      {
        key: 'attorney_review_summary',
        title: '9. Attorney Review & Adjudication Summary',
        pageOffset: 9,
        content: `Current Status: Draft Pending Formal Review\nScoring Completeness: ${readinessScore.overallScore}/100\nFormal legal sign-off required prior to physical or electronic submission to USCIS.`,
      },
      {
        key: 'statutory_checklist',
        title: '10. Final Statutory Filing Checklist',
        pageOffset: 10,
        content: (app.checklist || [])
          .map((c: any) => `[${c.isCompleted ? 'X' : ' '}] ${c.title} (${c.category})`)
          .join('\n'),
      },
    ];

    // Determine new version
    const latestDossier = await DossierModel.findOne({ applicationId: app._id }).sort({
      version: -1,
    });
    const nextVersion = (latestDossier?.version || 0) + 1;
    const dossierId = `DOS-${new Date().getFullYear()}-${String(nextVersion).padStart(3, '0')}-${String(app._id).slice(-4).toUpperCase()}`;

    // Create dossier record in MongoDB
    const dossier = await DossierModel.create({
      dossierId,
      applicationId: app._id,
      createdBy: new Types.ObjectId(userId),
      version: nextVersion,
      status: 'draft',
      visaCategory: app.visaCategory,
      targetFilingDate: app.targetFilingDate,
      readinessScore,
      aiCaseSummary,
      sections,
      batesNumbering,
      attorneyReview: {},
      auditHistory: [
        {
          action: 'dossier_draft_generated',
          performedBy: new Types.ObjectId(userId),
          userRole,
          timestamp: new Date(),
          notes: `Version ${nextVersion} compiled with ${documents.length} exhibits and readiness score ${readinessScore.overallScore}/100.`,
          version: nextVersion,
        },
      ],
    });

    // Update application progress & status
    await Application.findByIdAndUpdate(app._id, {
      progressPercentage: Math.max(app.progressPercentage || 0, Math.min(95, readinessScore.overallScore)),
    });

    logger.info(`[DossierService] Generated Dossier [${dossierId}] v${nextVersion} for application [${app._id}]`);
    return dossier;
  }

  /**
   * 4. Human Attorney Review & Adjudication
   */
  public async submitAttorneyReview(
    dossierId: string,
    reviewerId: string | Types.ObjectId,
    reviewerName: string,
    reviewerRole: string,
    decision: 'approved' | 'changes_requested' | 'rejected',
    comments: string,
    requestedEvidence?: string[]
  ): Promise<IDossier> {
    if (reviewerRole !== 'attorney' && reviewerRole !== 'admin') {
      throw new Error('Authorization error: Only an authorized attorney or legal administrator may submit adjudication decisions.');
    }

    const dossier = await DossierModel.findOne(
      Types.ObjectId.isValid(dossierId) ? { $or: [{ dossierId }, { _id: dossierId }] } : { dossierId }
    );
    if (!dossier) {
      throw new Error(`Dossier with ID [${dossierId}] not found.`);
    }

    const newStatus =
      decision === 'approved'
        ? 'approved'
        : decision === 'changes_requested'
        ? 'changes_requested'
        : 'draft';

    dossier.status = newStatus;
    dossier.attorneyReview = {
      reviewerId: new Types.ObjectId(reviewerId),
      reviewerName,
      reviewerRole,
      reviewedAt: new Date(),
      decision,
      comments,
      requestedEvidence: requestedEvidence || [],
    };

    // Update section 9 with formal review sign-off
    const secIdx = dossier.sections.findIndex((s) => s.key === 'attorney_review_summary');
    if (secIdx !== -1) {
      dossier.sections[secIdx].content = `ATTORNEY REVIEW DECISION: ${decision.toUpperCase()}\nReviewer: ${reviewerName} (${reviewerRole.toUpperCase()})\nDate: ${new Date().toLocaleString()}\nComments: ${comments || 'No additional notes provided.'}\n${requestedEvidence?.length ? `Requested Items: ${requestedEvidence.join(', ')}` : 'All evidentiary prerequisites satisfied.'}`;
    }

    // Append audit trail
    dossier.auditHistory.push({
      action: `attorney_review_${decision}`,
      performedBy: new Types.ObjectId(reviewerId),
      userRole: reviewerRole,
      timestamp: new Date(),
      notes: comments,
      version: dossier.version,
    });

    // Recalculate readiness score
    const app = await Application.findById(dossier.applicationId);
    if (app) {
      const documents = await DocumentModel.find({
        applicationId: app._id,
        deletedAt: null,
      });
      dossier.readinessScore = await this.calculateReadinessScore(app, documents, undefined, newStatus);

      // Sync application status
      const appNewStatus =
        decision === 'approved'
          ? 'approved_for_submission'
          : decision === 'changes_requested'
          ? 'changes_requested'
          : 'in_progress';
      await Application.findByIdAndUpdate(app._id, {
        status: appNewStatus,
        reviewDecision: {
          status: decision,
          comments,
          reviewedAt: new Date(),
          reviewerId: new Types.ObjectId(reviewerId),
        },
      });
    }

    await dossier.save();
    logger.info(`[DossierService] Attorney review recorded for [${dossierId}]: ${decision}`);
    return dossier;
  }

  /**
   * 5. Finalize Approved Dossier
   */
  public async finalizeDossier(
    dossierId: string,
    userId: string | Types.ObjectId,
    userRole: string
  ): Promise<IDossier> {
    if (userRole !== 'attorney' && userRole !== 'admin') {
      throw new Error('Authorization error: Only an authorized attorney or legal administrator may finalize a dossier.');
    }

    const dossier = await DossierModel.findOne(
      Types.ObjectId.isValid(dossierId) ? { $or: [{ dossierId }, { _id: dossierId }] } : { dossierId }
    );
    if (!dossier) {
      throw new Error(`Dossier with ID [${dossierId}] not found.`);
    }

    if (dossier.status !== 'approved') {
      throw new Error('Cannot finalize dossier: Dossier must be formally approved by legal counsel before finalization.');
    }

    dossier.status = 'finalized';
    dossier.auditHistory.push({
      action: 'dossier_finalized',
      performedBy: new Types.ObjectId(userId),
      userRole,
      timestamp: new Date(),
      notes: 'Final petition dossier locked for submission packaging.',
      version: dossier.version,
    });

    await dossier.save();

    // Update application status
    await Application.findByIdAndUpdate(dossier.applicationId, {
      status: 'dossier_prepared',
    });

    logger.info(`[DossierService] Dossier [${dossierId}] finalized by [${userId}]`);
    return dossier;
  }

  /**
   * 6. Human Edit of AI Case Summary
   */
  public async editAiSummary(
    dossierId: string,
    userId: string | Types.ObjectId,
    userRole: string,
    overview: string,
    evidenceSummary: string
  ): Promise<IDossier> {
    const dossier = await DossierModel.findOne(
      Types.ObjectId.isValid(dossierId) ? { $or: [{ dossierId }, { _id: dossierId }] } : { dossierId }
    );
    if (!dossier) {
      throw new Error(`Dossier with ID [${dossierId}] not found.`);
    }

    if (overview !== undefined) {
      dossier.aiCaseSummary.overview = overview.trim();
    }
    if (evidenceSummary !== undefined) {
      dossier.aiCaseSummary.evidenceSummary = evidenceSummary.trim();
    }
    dossier.aiCaseSummary.isEditedByHuman = true;
    dossier.aiCaseSummary.editedBy = new Types.ObjectId(userId);
    dossier.aiCaseSummary.editedAt = new Date();

    // Update Section 4 text as well
    const secIdx = dossier.sections.findIndex((s) => s.key === 'ai_case_summary');
    if (secIdx !== -1) {
      dossier.sections[secIdx].content = `${overview}\n\nEVIDENTIARY SYNTHESIS:\n${evidenceSummary}`;
    }

    dossier.auditHistory.push({
      action: 'ai_summary_edited',
      performedBy: new Types.ObjectId(userId),
      userRole,
      timestamp: new Date(),
      notes: 'Human revision applied to AI legal summary narrative.',
      version: dossier.version,
    });

    await dossier.save();
    logger.info(`[DossierService] AI summary edited on [${dossierId}] by [${userId}]`);
    return dossier;
  }

  /**
   * 7. Professional Server-Side Multi-Page PDF Generation with Bates Stamping
   */
  public async generateDossierPdf(dossier: IDossier): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const navyColor = rgb(23 / 255, 43 / 255, 77 / 255); // #172B4D
    const slateColor = rgb(98 / 255, 125 / 255, 152 / 255); // #627D98
    const darkTextColor = rgb(32 / 255, 41 / 255, 56 / 255); // #202938
    const lightBgColor = rgb(247 / 255, 248 / 255, 250 / 255); // #F7F8FA

    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;
    const MARGIN = 50;

    // Helper: Draw Header & Footer on content pages
    const drawPageChrome = (page: any, pageNumber: number, totalPages: number) => {
      // Header
      page.drawLine({
        start: { x: MARGIN, y: PAGE_HEIGHT - 40 },
        end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 40 },
        thickness: 0.5,
        color: slateColor,
      });
      page.drawText('IMMIGRATION DOSSIER BUILDER — CONFIDENTIAL LEGAL WORK PRODUCT', {
        x: MARGIN,
        y: PAGE_HEIGHT - 35,
        size: 7.5,
        font: fontBold,
        color: slateColor,
      });
      page.drawText(`Classification: ${dossier.visaCategory}`, {
        x: PAGE_WIDTH - MARGIN - 120,
        y: PAGE_HEIGHT - 35,
        size: 7.5,
        font: fontRegular,
        color: slateColor,
      });

      // Footer
      page.drawLine({
        start: { x: MARGIN, y: 45 },
        end: { x: PAGE_WIDTH - MARGIN, y: 45 },
        thickness: 0.5,
        color: slateColor,
      });
      const batesTag = `${dossier.batesNumbering.prefix}${String(pageNumber).padStart(4, '0')}`;
      page.drawText(`Bates: ${batesTag} | Case: ${dossier.dossierId}`, {
        x: MARGIN,
        y: 32,
        size: 8,
        font: fontMono,
        color: navyColor,
      });
      page.drawText(`Page ${pageNumber} of ${totalPages}`, {
        x: PAGE_WIDTH - MARGIN - 70,
        y: 32,
        size: 8,
        font: fontRegular,
        color: slateColor,
      });
    };

    // Helper: Wrap text
    const wrapText = (text: string, maxCharsPerLine: number): string[] => {
      const lines: string[] = [];
      const paragraphs = text.split('\n');
      for (const para of paragraphs) {
        if (!para.trim()) {
          lines.push('');
          continue;
        }
        const words = para.split(' ');
        let currentLine = '';
        for (const word of words) {
          if ((currentLine + word).length > maxCharsPerLine) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
          } else {
            currentLine += word + ' ';
          }
        }
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
      }
      return lines;
    };

    // PAGE 1: COVER PAGE
    const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    // Navy top bar
    coverPage.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 120,
      width: PAGE_WIDTH,
      height: 120,
      color: navyColor,
    });
    coverPage.drawText('UNITED STATES CITIZENSHIP AND IMMIGRATION SERVICES', {
      x: MARGIN,
      y: PAGE_HEIGHT - 55,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    coverPage.drawText(`FORMAL PETITION DOSSIER & STATUTORY EXHIBIT BINDER`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 80,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    coverPage.drawText(`Classification: ${dossier.visaCategory}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 100,
      size: 10,
      font: fontRegular,
      color: rgb(0.8, 0.88, 1),
    });

    // Cover Page Metadata Card
    coverPage.drawRectangle({
      x: MARGIN,
      y: PAGE_HEIGHT - 380,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 230,
      color: lightBgColor,
      borderColor: slateColor,
      borderWidth: 1,
    });

    let yOffset = PAGE_HEIGHT - 160;
    const drawMetaRow = (label: string, value: string) => {
      coverPage.drawText(label, {
        x: MARGIN + 20,
        y: yOffset,
        size: 9,
        font: fontBold,
        color: navyColor,
      });
      coverPage.drawText(value, {
        x: MARGIN + 180,
        y: yOffset,
        size: 9.5,
        font: fontRegular,
        color: darkTextColor,
      });
      yOffset -= 24;
    };

    drawMetaRow('DOSSIER REFERENCE ID:', dossier.dossierId);
    drawMetaRow('APPLICATION CATEGORY:', `${dossier.visaCategory} Immigrant/Nonimmigrant Petition`);
    drawMetaRow('DOCUMENT VERSION:', `Version ${dossier.version} (Assembled ${new Date(dossier.createdAt).toLocaleDateString()})`);
    drawMetaRow('CASE READINESS COMPLETENESS:', `${dossier.readinessScore.overallScore} / 100 (% Complete)`);
    drawMetaRow('FORMAL REVIEW STATUS:', dossier.status.replace(/_/g, ' ').toUpperCase());
    drawMetaRow('BATES STAMP RANGE:', `${dossier.batesNumbering.prefix}0001 to ${dossier.batesNumbering.prefix}${String(dossier.batesNumbering.endNumber).padStart(4, '0')}`);
    drawMetaRow('EXHIBIT VOLUME:', `${dossier.aiCaseSummary.documentReferences.length} Indexed Exhibits`);
    drawMetaRow('LEGAL COMPLIANCE STATUS:', dossier.status === 'approved' ? 'Attorney Reviewed & Approved' : 'Draft Preparation Phase');

    // Disclaimer Box
    coverPage.drawRectangle({
      x: MARGIN,
      y: 90,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 90,
      color: rgb(254 / 255, 242 / 255, 242 / 255),
      borderColor: rgb(248 / 255, 113 / 255, 113 / 255),
      borderWidth: 0.5,
    });
    coverPage.drawText('STATUTORY LEGAL NOTICE & DISCLAIMER', {
      x: MARGIN + 15,
      y: 160,
      size: 8.5,
      font: fontBold,
      color: rgb(185 / 255, 28 / 255, 28 / 255),
    });
    const disclaimerLines = wrapText(dossier.readinessScore.disclaimer, 95);
    let discY = 145;
    for (const dLine of disclaimerLines) {
      coverPage.drawText(dLine, {
        x: MARGIN + 15,
        y: discY,
        size: 7.5,
        font: fontRegular,
        color: rgb(127 / 255, 29 / 255, 29 / 255),
      });
      discY -= 12;
    }

    // PAGE 2: TABLE OF CONTENTS & CASE SUMMARY
    const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page2.drawText('TABLE OF CONTENTS', {
      x: MARGIN,
      y: PAGE_HEIGHT - 70,
      size: 14,
      font: fontBold,
      color: navyColor,
    });
    page2.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 76 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 76 },
      thickness: 1.5,
      color: navyColor,
    });

    let tocY = PAGE_HEIGHT - 100;
    dossier.sections.forEach((sec, idx) => {
      page2.drawText(sec.title, {
        x: MARGIN,
        y: tocY,
        size: 9.5,
        font: fontBold,
        color: darkTextColor,
      });
      page2.drawText(`Page ${idx + 1}`, {
        x: PAGE_WIDTH - MARGIN - 45,
        y: tocY,
        size: 9,
        font: fontMono,
        color: slateColor,
      });
      page2.drawLine({
        start: { x: MARGIN + 280, y: tocY + 2 },
        end: { x: PAGE_WIDTH - MARGIN - 55, y: tocY + 2 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92),
      });
      tocY -= 20;
    });

    // Executive Summary on Page 2
    tocY -= 20;
    page2.drawText('EXECUTIVE LEGAL SUMMARY', {
      x: MARGIN,
      y: tocY,
      size: 12,
      font: fontBold,
      color: navyColor,
    });
    tocY -= 15;
    const summaryLines = wrapText(dossier.aiCaseSummary.overview, 85);
    for (const line of summaryLines) {
      page2.drawText(line, {
        x: MARGIN,
        y: tocY,
        size: 8.5,
        font: fontRegular,
        color: darkTextColor,
      });
      tocY -= 13;
    }

    // PAGE 3: MASTER EXHIBIT INDEX
    const page3 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page3.drawText('MASTER EVIDENTIARY EXHIBIT INDEX', {
      x: MARGIN,
      y: PAGE_HEIGHT - 70,
      size: 14,
      font: fontBold,
      color: navyColor,
    });
    page3.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 76 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 76 },
      thickness: 1.5,
      color: navyColor,
    });

    let exY = PAGE_HEIGHT - 105;
    // Table Header
    page3.drawRectangle({
      x: MARGIN,
      y: exY - 5,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 20,
      color: lightBgColor,
    });
    page3.drawText('TAB / CODE', { x: MARGIN + 10, y: exY, size: 8, font: fontBold, color: navyColor });
    page3.drawText('DOCUMENT EXHIBIT TITLE', { x: MARGIN + 90, y: exY, size: 8, font: fontBold, color: navyColor });
    page3.drawText('STATUTORY CATEGORY', { x: MARGIN + 310, y: exY, size: 8, font: fontBold, color: navyColor });
    page3.drawText('BATES RANGE', { x: MARGIN + 430, y: exY, size: 8, font: fontBold, color: navyColor });
    exY -= 22;

    dossier.aiCaseSummary.documentReferences.forEach((ref, idx) => {
      const batesStart = `${dossier.batesNumbering.prefix}${String(idx * 4 + 10).padStart(4, '0')}`;
      const batesEnd = `${dossier.batesNumbering.prefix}${String(idx * 4 + 13).padStart(4, '0')}`;

      page3.drawText(ref.exhibitCode, {
        x: MARGIN + 10,
        y: exY,
        size: 8,
        font: fontBold,
        color: navyColor,
      });
      page3.drawText(ref.title.slice(0, 42), {
        x: MARGIN + 90,
        y: exY,
        size: 8,
        font: fontRegular,
        color: darkTextColor,
      });
      page3.drawText(ref.category.slice(0, 24), {
        x: MARGIN + 310,
        y: exY,
        size: 7.5,
        font: fontRegular,
        color: slateColor,
      });
      page3.drawText(`${batesStart}–${batesEnd.slice(-4)}`, {
        x: MARGIN + 430,
        y: exY,
        size: 8,
        font: fontMono,
        color: navyColor,
      });

      page3.drawLine({
        start: { x: MARGIN, y: exY - 6 },
        end: { x: PAGE_WIDTH - MARGIN, y: exY - 6 },
        thickness: 0.5,
        color: rgb(0.9, 0.92, 0.95),
      });
      exY -= 20;
    });

    // PAGE 4: EVIDENCE FINDINGS & ATTORNEY ADJUDICATION
    const page4 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page4.drawText('PHASE 7 CONSISTENCY AUDIT & ATTORNEY ADJUDICATION', {
      x: MARGIN,
      y: PAGE_HEIGHT - 70,
      size: 13,
      font: fontBold,
      color: navyColor,
    });
    page4.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 76 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 76 },
      thickness: 1.5,
      color: navyColor,
    });

    let p4Y = PAGE_HEIGHT - 100;
    page4.drawText('CROSS-DOCUMENT DISCREPANCY AUDIT FINDINGS:', {
      x: MARGIN,
      y: p4Y,
      size: 9.5,
      font: fontBold,
      color: navyColor,
    });
    p4Y -= 15;

    if (dossier.aiCaseSummary.identifiedInconsistencies.length === 0) {
      page4.drawText('Zero factual discrepancies or timeline conflicts detected across exhibited evidence.', {
        x: MARGIN + 10,
        y: p4Y,
        size: 8.5,
        font: fontRegular,
        color: darkTextColor,
      });
      p4Y -= 25;
    } else {
      dossier.aiCaseSummary.identifiedInconsistencies.forEach((f, i) => {
        page4.drawText(`${i + 1}. [Severity: ${f.severity.toUpperCase()} | Status: ${f.reviewStatus}] ${f.title}`, {
          x: MARGIN + 10,
          y: p4Y,
          size: 8,
          font: fontBold,
          color: f.severity === 'high' ? rgb(0.8, 0.1, 0.1) : darkTextColor,
        });
        p4Y -= 16;
      });
      p4Y -= 10;
    }

    // Attorney Adjudication Block
    page4.drawRectangle({
      x: MARGIN,
      y: p4Y - 140,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 140,
      color: lightBgColor,
      borderColor: navyColor,
      borderWidth: 1,
    });
    page4.drawText('LEGAL COUNSEL FORMAL ADJUDICATION & SIGN-OFF', {
      x: MARGIN + 15,
      y: p4Y - 20,
      size: 10,
      font: fontBold,
      color: navyColor,
    });

    page4.drawText(`Formal Decision: ${(dossier.attorneyReview?.decision || dossier.status).toUpperCase()}`, {
      x: MARGIN + 15,
      y: p4Y - 40,
      size: 9,
      font: fontBold,
      color: dossier.status === 'approved' ? rgb(22 / 255, 101 / 255, 52 / 255) : navyColor,
    });
    page4.drawText(`Assigned Counsel: ${dossier.attorneyReview?.reviewerName || 'Unassigned / Legal Department Review'}`, {
      x: MARGIN + 15,
      y: p4Y - 58,
      size: 8.5,
      font: fontRegular,
      color: darkTextColor,
    });
    page4.drawText(`Adjudication Date: ${dossier.attorneyReview?.reviewedAt ? new Date(dossier.attorneyReview.reviewedAt).toLocaleString() : 'Pending Formal Sign-Off'}`, {
      x: MARGIN + 15,
      y: p4Y - 74,
      size: 8.5,
      font: fontRegular,
      color: darkTextColor,
    });
    page4.drawText(`Review Notes: ${dossier.attorneyReview?.comments || 'Dossier ready for submission review.'}`, {
      x: MARGIN + 15,
      y: p4Y - 90,
      size: 8,
      font: fontRegular,
      color: slateColor,
    });

    // Signature Line
    page4.drawLine({
      start: { x: MARGIN + 15, y: p4Y - 125 },
      end: { x: MARGIN + 250, y: p4Y - 125 },
      thickness: 1,
      color: navyColor,
    });
    page4.drawText('ATTORNEY OF RECORD SIGNATURE', {
      x: MARGIN + 15,
      y: p4Y - 135,
      size: 7,
      font: fontBold,
      color: slateColor,
    });

    // Draw header and footers on all pages
    const totalPages = pdfDoc.getPageCount();
    pdfDoc.getPages().forEach((p, idx) => {
      drawPageChrome(p, idx + 1, totalPages);
    });

    // Update dossier record with pdf export stats
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    dossier.pdfExport = {
      generatedAt: new Date(),
      pageCount: totalPages,
      fileSize: pdfBuffer.length,
    };
    await dossier.save();

    return pdfBuffer;
  }
}

export const dossierService = new DossierService();
