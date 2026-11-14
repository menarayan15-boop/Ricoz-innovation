// backend/src/controllers/evidence.controller.ts
// REST Controller for Phase 7 Evidence Intelligence, Discrepancies, Gaps & Statutory Criteria

import { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Application, IApplication } from '../models/application.model.js';
import { DocumentModel } from '../models/document.model.js';
import {
  EvidenceAnalysis,
  EvidenceFindingRecord,
  EvidenceMapping,
  EvidenceGap,
} from '../models/evidence-intelligence.model.js';
import { comparisonService } from '../services/comparison.service.js';
import { logger } from '../utils/logger.js';

/**
 * Access Control Helper: Zero-Trust verification of application ownership
 */
const verifyApplicationAccess = async (
  applicationId: string,
  user: any
): Promise<IApplication | null> => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    return null;
  }

  const app = await Application.findById(applicationId);
  if (!app) return null;

  // Admin and Attorney roles have organization/assigned access
  if (user.role === 'admin') return app;

  if (user.role === 'attorney') {
    if (app.assignedAttorneyId && app.assignedAttorneyId.toString() === user._id.toString()) {
      return app;
    }
    // Attorneys can review cases in system
    return app;
  }

  // Applicants can only access their own petitions
  if (app.applicantId.toString() === user._id.toString()) {
    return app;
  }

  // Employers can access petitions they sponsor
  if (app.employerId && app.employerId.toString() === user._id.toString()) {
    return app;
  }

  return null;
};

/**
 * POST /api/v1/applications/:id/evidence/analyze
 * Trigger a new cross-document analysis run
 */
export const runEvidenceAnalysis = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const { id } = req.params;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied or petition not found.' });
      return;
    }

    const result = await comparisonService.analyzeApplicationEvidence(id, user._id.toString());

    res.status(200).json({
      success: true,
      message: `Analysis completed: ${result.findings.length} findings, ${result.gaps.length} gaps, ${result.analysis.summaryMetrics.coveragePercentage}% criteria coverage.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error running evidence analysis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete evidence analysis.',
    });
  }
};

/**
 * GET /api/v1/applications/:id/evidence/findings
 * Retrieve discrepancy findings with filtering
 */
export const getEvidenceFindings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { severity, reviewStatus } = req.query;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const filter: any = { applicationId: new Types.ObjectId(id) };
    if (severity) filter.severity = severity;
    if (reviewStatus) filter.reviewStatus = reviewStatus;

    const findings = await EvidenceFindingRecord.find(filter).sort({ createdAt: -1 });

    const totalCount = await EvidenceFindingRecord.countDocuments({
      applicationId: new Types.ObjectId(id),
    });

    const severityBreakdown = {
      informational: await EvidenceFindingRecord.countDocuments({
        applicationId: new Types.ObjectId(id),
        severity: 'informational',
      }),
      low: await EvidenceFindingRecord.countDocuments({
        applicationId: new Types.ObjectId(id),
        severity: 'low',
      }),
      medium: await EvidenceFindingRecord.countDocuments({
        applicationId: new Types.ObjectId(id),
        severity: 'medium',
      }),
      high: await EvidenceFindingRecord.countDocuments({
        applicationId: new Types.ObjectId(id),
        severity: 'high',
      }),
    };

    res.status(200).json({
      success: true,
      findings,
      totalCount,
      severityBreakdown,
    });
  } catch (error: any) {
    logger.error('Error fetching evidence findings:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve evidence findings.' });
  }
};

/**
 * PATCH /api/v1/evidence/findings/:id/review
 * Human verification action: confirm, correct, dismiss, or assign to attorney
 */
export const reviewEvidenceFinding = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const { id } = req.params;
    const { reviewStatus, reviewNotes, humanCorrection, assignedAttorneyId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid finding ID.' });
      return;
    }

    const finding = await EvidenceFindingRecord.findById(id);
    if (!finding) {
      res.status(404).json({ success: false, message: 'Evidence finding not found.' });
      return;
    }

    const app = await verifyApplicationAccess(finding.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const validStatuses = [
      'awaiting_review',
      'confirmed',
      'corrected',
      'dismissed',
      'evidence_requested',
      'assigned_for_attorney_review',
    ];

    if (reviewStatus && !validStatuses.includes(reviewStatus)) {
      res.status(400).json({ success: false, message: `Invalid review status: ${reviewStatus}` });
      return;
    }

    finding.reviewStatus = reviewStatus || finding.reviewStatus;
    if (reviewNotes !== undefined) finding.reviewNotes = reviewNotes;
    if (humanCorrection !== undefined) finding.humanCorrection = humanCorrection;
    if (assignedAttorneyId && mongoose.Types.ObjectId.isValid(assignedAttorneyId)) {
      finding.assignedAttorneyId = new Types.ObjectId(assignedAttorneyId);
    }
    finding.reviewedBy = new Types.ObjectId(user._id);
    finding.reviewedAt = new Date();

    await finding.save();

    logger.info(
      `[Evidence Finding] Finding [${finding.findingId}] updated by user [${user._id}] to status [${finding.reviewStatus}]`
    );

    res.status(200).json({
      success: true,
      message: `Finding updated to [${finding.reviewStatus}].`,
      finding,
    });
  } catch (error: any) {
    logger.error('Error reviewing evidence finding:', error);
    res.status(500).json({ success: false, message: 'Failed to update review status.' });
  }
};

/**
 * GET /api/v1/applications/:id/evidence/gaps
 * Retrieve missing evidence gaps
 */
export const getEvidenceGaps = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const gaps = await EvidenceGap.find({ applicationId: new Types.ObjectId(id) }).sort({
      priority: 1,
    });

    res.status(200).json({
      success: true,
      gaps,
      openGapsCount: gaps.filter((g) => g.resolutionStatus === 'open').length,
    });
  } catch (error: any) {
    logger.error('Error fetching evidence gaps:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve evidence gaps.' });
  }
};

/**
 * PATCH /api/v1/evidence/gaps/:id
 * Resolve or waive an evidence gap
 */
export const resolveEvidenceGap = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { resolutionStatus, waivedReason, resolvedWithDocumentId } = req.body;

    const gap = await EvidenceGap.findById(id);
    if (!gap) {
      res.status(404).json({ success: false, message: 'Evidence gap not found.' });
      return;
    }

    const app = await verifyApplicationAccess(gap.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    if (resolutionStatus) gap.resolutionStatus = resolutionStatus;
    if (waivedReason) gap.waivedReason = waivedReason;
    if (resolvedWithDocumentId && mongoose.Types.ObjectId.isValid(resolvedWithDocumentId)) {
      gap.resolvedWithDocumentId = new Types.ObjectId(resolvedWithDocumentId);
    }

    await gap.save();

    res.status(200).json({
      success: true,
      message: `Evidence gap updated to [${gap.resolutionStatus}].`,
      gap,
    });
  } catch (error: any) {
    logger.error('Error updating evidence gap:', error);
    res.status(500).json({ success: false, message: 'Failed to update evidence gap.' });
  }
};

/**
 * GET /api/v1/applications/:id/evidence/mappings
 * Retrieve statutory criteria mappings
 */
export const getEvidenceMappings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const mappings = await EvidenceMapping.find({
      applicationId: new Types.ObjectId(id),
    }).sort({ createdAt: 1 });

    const supportedCount = mappings.filter((m) => m.status === 'supported').length;
    const totalCount = mappings.length;
    const coveragePercentage = totalCount > 0 ? Math.round((supportedCount / totalCount) * 100) : 0;

    res.status(200).json({
      success: true,
      mappings,
      supportedCount,
      totalCount,
      coveragePercentage,
    });
  } catch (error: any) {
    logger.error('Error fetching evidence mappings:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve evidence mappings.' });
  }
};

/**
 * PATCH /api/v1/evidence/mappings/:id
 * Update statutory criteria mapping status
 */
export const updateEvidenceMapping = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const { id } = req.params;
    const { status, notes } = req.body;

    const mapping = await EvidenceMapping.findById(id);
    if (!mapping) {
      res.status(404).json({ success: false, message: 'Evidence mapping not found.' });
      return;
    }

    const app = await verifyApplicationAccess(mapping.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    if (status) mapping.status = status;
    if (notes !== undefined) mapping.notes = notes;
    mapping.reviewedBy = new Types.ObjectId(user._id);
    mapping.reviewedAt = new Date();

    await mapping.save();

    res.status(200).json({
      success: true,
      message: `Mapping updated to [${mapping.status}].`,
      mapping,
    });
  } catch (error: any) {
    logger.error('Error updating evidence mapping:', error);
    res.status(500).json({ success: false, message: 'Failed to update mapping.' });
  }
};

/**
 * GET /api/v1/applications/:id/evidence/analyses
 * Retrieve past analysis runs
 */
export const getEvidenceAnalyses = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const analyses = await EvidenceAnalysis.find({
      applicationId: new Types.ObjectId(id),
    })
      .sort({ createdAt: -1 })
      .populate('runBy', 'name email role');

    res.status(200).json({
      success: true,
      analyses,
    });
  } catch (error: any) {
    logger.error('Error fetching analysis history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve analysis history.' });
  }
};

/**
 * GET /api/v1/applications/:id/evidence/matrix
 * Retrieve structured comparison matrix across exhibits
 */
export const getEvidenceMatrix = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const matrix = await comparisonService.getComparisonMatrix(id);

    res.status(200).json({
      success: true,
      data: matrix,
    });
  } catch (error: any) {
    logger.error('Error fetching evidence comparison matrix:', error);
    res.status(500).json({ success: false, message: 'Failed to generate comparison matrix.' });
  }
};

/**
 * GET /api/v1/applications/:id/evidence/report
 * Generate structured Evidence Review Dossier Summary
 */
export const getEvidenceReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const { id } = req.params;

    const app = await verifyApplicationAccess(id, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    // 1. Gather all documents
    const documents = await DocumentModel.find({
      applicationId: new Types.ObjectId(id),
      deletedAt: null,
    }).select('title originalFilename category checksum pageCount createdAt');

    // 2. Gather findings
    const findings = await EvidenceFindingRecord.find({
      applicationId: new Types.ObjectId(id),
    }).sort({ severity: 1 });

    // 3. Gather gaps
    const gaps = await EvidenceGap.find({
      applicationId: new Types.ObjectId(id),
    });

    // 4. Gather statutory mappings
    const mappings = await EvidenceMapping.find({
      applicationId: new Types.ObjectId(id),
    });

    // 5. Gather latest analysis
    const latestAnalysis = await EvidenceAnalysis.findOne({
      applicationId: new Types.ObjectId(id),
      status: 'completed',
    }).sort({ completedAt: -1 });

    const verifiedFacts = [
      `Application Category: ${app.visaCategory}`,
      `Application Status: ${app.status.toUpperCase()}`,
      `Total Evidentiary Exhibits Analyzed: ${documents.length}`,
      `Statutory Criteria Evaluated: ${mappings.length}`,
      `Criteria With Supported Exhibits: ${mappings.filter((m) => m.status === 'supported').length}`,
    ];

    const report = {
      reportId: `RPT-EVD-${Date.now().toString().slice(-8)}`,
      generatedAt: new Date(),
      generatedBy: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      application: {
        id: app._id,
        category: app.visaCategory,
        title: app.title,
        status: app.status,
        createdAt: app.createdAt,
      },
      summary: {
        documentsCount: documents.length,
        findingsCount: findings.length,
        openFindingsCount: findings.filter((f) => f.reviewStatus === 'awaiting_review').length,
        gapsCount: gaps.filter((g) => g.resolutionStatus === 'open').length,
        criteriaCoveragePercentage:
          mappings.length > 0
            ? Math.round(
                (mappings.filter((m) => m.status === 'supported').length / mappings.length) * 100
              )
            : 0,
      },
      documents: documents.map((d) => ({
        id: d._id,
        name: d.title || d.originalFilename,
        category: d.category,
        checksum: d.checksum,
        pageCount: d.metadata?.pageCount || 1,
      })),
      verifiedFacts,
      findings: findings.map((f) => ({
        id: f.findingId,
        category: f.category,
        title: f.title,
        severity: f.severity,
        reviewStatus: f.reviewStatus,
        explanation: f.explanation,
        recommendedAction: f.recommendedReviewAction,
        affectedDocuments: f.affectedDocuments.map((ad) => ad.documentTitle),
      })),
      evidenceGaps: gaps.map((g) => ({
        item: g.requiredItem,
        description: g.description,
        priority: g.priority,
        status: g.resolutionStatus,
      })),
      statutoryCriteria: mappings.map((m) => ({
        criterion: m.criterionTitle,
        prong: m.criterionProng,
        status: m.status,
        mappedExhibitCount: m.mappedDocuments.length,
      })),
      auditNotes:
        'This Evidence Dossier Summary reflects automated cross-document verification and authorized human legal review under the Immigration & Work Visa Dossier Builder.',
    };

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Error generating evidence report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate evidence report.' });
  }
};
