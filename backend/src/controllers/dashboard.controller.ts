import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Application } from '../models/application.model.js';
import { DocumentModel } from '../models/document.model.js';

export const getDashboardSummary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Role-based scoping query for applications
    let appQuery: Record<string, unknown> = {};
    if (user.role === 'applicant') {
      appQuery = { applicantId: user._id };
    } else if (user.role === 'attorney') {
      appQuery = { assignedAttorneyId: user._id };
    } else if (user.role === 'employer') {
      appQuery = { employerId: user._id };
    } else if (user.role === 'admin') {
      appQuery = {};
    }

    // Run parallel counts for fast response (< 50ms)
    const [
      totalCases,
      activePetitions,
      attorneyReviewCount,
      missingEvidenceCount,
      finalDossiersCount,
      applicationsList,
    ] = await Promise.all([
      Application.countDocuments(appQuery),
      Application.countDocuments({
        ...appQuery,
        status: {
          $in: [
            'draft',
            'in_progress',
            'evidence_pending',
            'documents_pending',
            'ai_analyzed',
            'under_attorney_review',
            'changes_requested',
            'ready_for_final_review',
          ],
        },
      }),
      Application.countDocuments({
        ...appQuery,
        status: 'under_attorney_review',
      }),
      Application.countDocuments({
        ...appQuery,
        $or: [
          { status: 'evidence_pending' },
          { status: 'changes_requested' },
          { status: 'documents_pending' },
          { 'missingEvidenceRequests.0': { $exists: true } },
        ],
      }),
      Application.countDocuments({
        ...appQuery,
        status: {
          $in: [
            'approved_for_submission',
            'dossier_prepared',
            'ready_for_final_review',
          ],
        },
      }),
      Application.find(appQuery)
        .populate('applicantId', 'name email')
        .populate('assignedAttorneyId', 'name email')
        .sort({ updatedAt: -1 })
        .limit(10),
    ]);

    // Count documents across the scoped applications
    const applicationIds = applicationsList.map((a) => a._id);
    let exhibitsUploaded = 0;
    if (applicationIds.length > 0) {
      exhibitsUploaded = await DocumentModel.countDocuments({
        applicationId: { $in: applicationIds },
        deletedAt: null,
      });
    }

    // Category breakdown
    const categoryCounts: Record<string, number> = {
      'H-1B': 0,
      'O-1': 0,
      'EB-2': 0,
      'EB-2-NIW': 0,
    };
    applicationsList.forEach((app) => {
      if (categoryCounts[app.visaCategory] !== undefined) {
        categoryCounts[app.visaCategory]++;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalCases,
        activePetitions,
        exhibitsUploaded,
        attorneyReview: attorneyReviewCount,
        missingEvidence: missingEvidenceCount,
        finalDossiers: finalDossiersCount,
      },
      categoryCounts,
      recentApplications: applicationsList,
      userRole: user.role,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate dashboard summary metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

