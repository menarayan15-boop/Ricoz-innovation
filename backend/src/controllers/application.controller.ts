import { Response } from 'express';
import mongoose from 'mongoose';
import { Application } from '../models/application.model.js';
import { User } from '../models/user.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApplicationAuthorizedRequest } from '../middleware/ownership.middleware.js';
import { VisaCategory, ApplicationStatus } from '../types/index.js';

export const getApplications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const filter: Record<string, unknown> = {};

    // Role-filtered queries strictly enforced on database query
    if (user.role === 'applicant') {
      filter.applicantId = user._id;
    } else if (user.role === 'attorney') {
      filter.assignedAttorneyId = user._id;
    } else if (user.role === 'employer') {
      filter.employerId = user._id;
    } else if (user.role === 'admin') {
      // Admin can view all
    }

    // Category filter
    const { category } = req.query;
    if (category && typeof category === 'string' && category !== 'ALL') {
      filter.visaCategory = category;
    }

    // Status filter
    const { status } = req.query;
    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    // Search query across title, applicantDetails.fullName, or exact ID
    const { search } = req.query;
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const orConditions: Array<Record<string, unknown>> = [
        { title: searchRegex },
        { 'applicantDetails.fullName': searchRegex },
      ];
      if (mongoose.Types.ObjectId.isValid(search.trim())) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(search.trim()) });
      }
      filter.$or = orConditions;
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'updatedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [total, applications] = await Promise.all([
      Application.countDocuments(filter),
      Application.find(filter)
        .populate('applicantId', 'name email')
        .populate('assignedAttorneyId', 'name email')
        .populate('employerId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getApplicationById = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  // Authorization verified by validateApplicationAccess middleware
  const application = req.application;
  res.status(200).json({
    success: true,
    application,
  });
};

export const createApplication = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const {
      title,
      visaCategory,
      formData,
      employerId,
      applicantDetails,
      educationDetails,
      employmentDetails,
      categorySpecificDetails,
      targetFilingDate,
      draftStep,
    } = req.body;

    if (!title || !visaCategory) {
      res.status(400).json({
        success: false,
        message: 'Title and Visa Category are required fields.',
      });
      return;
    }

    const validCategories: VisaCategory[] = ['H-1B', 'O-1', 'EB-2', 'EB-2-NIW'];
    if (!validCategories.includes(visaCategory)) {
      res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
      return;
    }

    // Default applicant details from user account if not provided
    const initialApplicantDetails = {
      fullName: applicantDetails?.fullName || user.name,
      email: applicantDetails?.email || user.email,
      phone: applicantDetails?.phone || '',
      nationality: applicantDetails?.nationality || '',
      dateOfBirth: applicantDetails?.dateOfBirth || '',
      currentImmigrationStatus: applicantDetails?.currentImmigrationStatus || '',
      alienRegistrationNumber: applicantDetails?.alienRegistrationNumber || '',
      ...(applicantDetails || {}),
    };

    const newApp = await Application.create({
      applicantId: user.role === 'applicant' ? user._id : req.body.applicantId || user._id,
      employerId: user.role === 'employer' ? user._id : employerId,
      title: title.trim(),
      visaCategory,
      status: 'draft',
      currentStep: typeof draftStep === 'number' ? draftStep : 1,
      draftStep: typeof draftStep === 'number' ? draftStep : 1,
      applicantDetails: initialApplicantDetails,
      educationDetails: educationDetails || {},
      employmentDetails: employmentDetails || {},
      categorySpecificDetails: categorySpecificDetails || {},
      targetFilingDate: targetFilingDate ? new Date(targetFilingDate) : undefined,
      formData: formData || {},
      concurrencyVersion: 1,
    });

    res.status(201).json({
      success: true,
      message: 'Visa dossier application created successfully.',
      application: newApp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create application.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const saveDraft = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const {
      formData,
      currentStep,
      draftStep,
      title,
      targetFilingDate,
      status,
      applicantDetails,
      educationDetails,
      employmentDetails,
      categorySpecificDetails,
      concurrencyVersion,
    } = req.body;

    // Optimistic concurrency check (if client provides version)
    if (
      typeof concurrencyVersion === 'number' &&
      application.concurrencyVersion &&
      concurrencyVersion < application.concurrencyVersion
    ) {
      res.status(409).json({
        success: false,
        message: 'Conflict: This application has been updated in another session.',
        currentVersion: application.concurrencyVersion,
        application,
      });
      return;
    }

    if (applicantDetails) {
      application.applicantDetails = {
        ...(application.applicantDetails || {}),
        ...applicantDetails,
      };
      application.markModified('applicantDetails');
    }

    if (educationDetails) {
      application.educationDetails = {
        ...(application.educationDetails || {}),
        ...educationDetails,
      };
      application.markModified('educationDetails');
    }

    if (employmentDetails) {
      application.employmentDetails = {
        ...(application.employmentDetails || {}),
        ...employmentDetails,
      };
      application.markModified('employmentDetails');
    }

    if (categorySpecificDetails) {
      application.categorySpecificDetails = {
        ...(application.categorySpecificDetails || {}),
        ...categorySpecificDetails,
      };
      application.markModified('categorySpecificDetails');
    }

    if (formData !== undefined) {
      application.formData = { ...(application.formData || {}), ...formData };
      application.markModified('formData');
    }

    const stepNum = typeof draftStep === 'number' ? draftStep : currentStep;
    if (typeof stepNum === 'number' && stepNum >= 1 && stepNum <= 6) {
      application.currentStep = stepNum;
      application.draftStep = stepNum;
    }

    if (title && typeof title === 'string' && title.trim()) {
      application.title = title.trim();
    }

    if (targetFilingDate) {
      application.targetFilingDate = new Date(targetFilingDate);
    }

    if (status && ['draft', 'in_progress', 'evidence_pending'].includes(status)) {
      application.status = status;
    }

    application.concurrencyVersion = (application.concurrencyVersion || 1) + 1;
    await application.save();

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully.',
      concurrencyVersion: application.concurrencyVersion,
      progressPercentage: application.progressPercentage,
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save application draft.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updateApplication = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const {
      title,
      formData,
      status,
      currentStep,
      draftStep,
      targetFilingDate,
      applicantDetails,
      educationDetails,
      employmentDetails,
      categorySpecificDetails,
    } = req.body;

    if (title) application.title = title.trim();
    if (formData) {
      application.formData = formData;
      application.markModified('formData');
    }
    if (applicantDetails) {
      application.applicantDetails = applicantDetails;
      application.markModified('applicantDetails');
    }
    if (educationDetails) {
      application.educationDetails = educationDetails;
      application.markModified('educationDetails');
    }
    if (employmentDetails) {
      application.employmentDetails = employmentDetails;
      application.markModified('employmentDetails');
    }
    if (categorySpecificDetails) {
      application.categorySpecificDetails = categorySpecificDetails;
      application.markModified('categorySpecificDetails');
    }
    if (status) application.status = status;
    if (currentStep) application.currentStep = currentStep;
    if (draftStep) application.draftStep = draftStep;
    if (targetFilingDate) application.targetFilingDate = new Date(targetFilingDate);

    application.concurrencyVersion = (application.concurrencyVersion || 1) + 1;
    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application updated successfully.',
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update application.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updateApplicationStatus = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    const user = req.user;
    if (!application || !user) {
      res.status(400).json({ success: false, message: 'Application or user not found' });
      return;
    }

    const { status, reason } = req.body;
    const validStatuses: ApplicationStatus[] = [
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
    ];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    application.status = status;
    if (!application.statusHistory) application.statusHistory = [];
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: user._id as mongoose.Types.ObjectId,
      reason: reason || 'Status updated',
    });

    application.concurrencyVersion = (application.concurrencyVersion || 1) + 1;
    await application.save();

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}.`,
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update application status.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getChecklist = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const total = application.checklist.length;
    const completed = application.checklist.filter((i) => i.isCompleted).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.status(200).json({
      success: true,
      total,
      completed,
      progress,
      checklist: application.checklist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve checklist.',
    });
  }
};

export const toggleChecklistItem = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const { itemId } = req.params;
    const { isCompleted, notes } = req.body;

    const item = application.checklist.find((c) => c.id === itemId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Checklist item not found.' });
      return;
    }

    if (isCompleted !== undefined) {
      item.isCompleted = typeof isCompleted === 'boolean' ? isCompleted : !item.isCompleted;
    }
    if (notes !== undefined) {
      item.notes = notes;
    }
    item.updatedAt = new Date();

    application.markModified('checklist');
    await application.save();

    res.status(200).json({
      success: true,
      message: `Checklist item "${item.label}" updated.`,
      checklist: application.checklist,
      progressPercentage: application.progressPercentage,
      application,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update checklist item.' });
  }
};

export const addCustomChecklistItem = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const { label, section, description, required, notes } = req.body;
    if (!label || !section) {
      res.status(400).json({
        success: false,
        message: 'Label and section are required for a custom checklist item.',
      });
      return;
    }

    const newItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      section: section.trim(),
      label: label.trim(),
      description: description ? description.trim() : '',
      required: Boolean(required),
      isCompleted: false,
      isCustom: true,
      conditional: false,
      notes: notes || '',
      updatedAt: new Date(),
    };

    application.checklist.push(newItem);
    application.markModified('checklist');
    await application.save();

    res.status(201).json({
      success: true,
      message: `Custom checklist item "${newItem.label}" added.`,
      item: newItem,
      checklist: application.checklist,
      progressPercentage: application.progressPercentage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add custom checklist item.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const assignAttorney = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    const user = req.user;
    if (!application || !user) {
      res.status(400).json({ success: false, message: 'Application or user not found' });
      return;
    }

    // Only the owning applicant or admin can assign/invite an attorney
    if (user.role === 'applicant' && application.applicantId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only the case owner can assign legal counsel.',
      });
      return;
    }

    const { attorneyId, attorneyEmail } = req.body;
    let attorney;

    if (attorneyId && mongoose.Types.ObjectId.isValid(attorneyId)) {
      attorney = await User.findOne({ _id: attorneyId, role: 'attorney' });
    } else if (attorneyEmail) {
      attorney = await User.findOne({ email: attorneyEmail.toLowerCase(), role: 'attorney' });
    }

    if (!attorney) {
      res.status(404).json({
        success: false,
        message: 'No verified attorney found matching the specified ID or email.',
      });
      return;
    }

    application.assignedAttorneyId = attorney._id as mongoose.Types.ObjectId;
    application.status = 'under_attorney_review';
    if (!application.statusHistory) application.statusHistory = [];
    application.statusHistory.push({
      status: 'under_attorney_review',
      changedAt: new Date(),
      changedBy: user._id as mongoose.Types.ObjectId,
      reason: `Assigned legal counsel: ${attorney.name}`,
    });

    await application.save();

    res.status(200).json({
      success: true,
      message: `Attorney ${attorney.name} has been assigned to this application.`,
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign attorney.',
    });
  }
};

export const recordAttorneyReview = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    const user = req.user;
    if (!application || !user) {
      res.status(400).json({ success: false, message: 'Application or user not found' });
      return;
    }

    // Explicit attorney assignment check
    if (
      user.role !== 'admin' &&
      (!application.assignedAttorneyId ||
        application.assignedAttorneyId.toString() !== user._id.toString())
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the assigned attorney for this case.',
      });
      return;
    }

    const { decision, status, comments } = req.body;
    const reviewDecision = decision || status;
    if (!['approved', 'changes_requested', 'rejected'].includes(reviewDecision)) {
      res.status(400).json({
        success: false,
        message: 'Decision must be one of: approved, changes_requested, rejected',
      });
      return;
    }

    application.reviewDecision = {
      status: reviewDecision,
      comments: comments || '',
      reviewedAt: new Date(),
      reviewerId: user._id as mongoose.Types.ObjectId,
    };

    if (reviewDecision === 'approved') {
      application.status = 'approved_for_submission';
    } else if (reviewDecision === 'changes_requested') {
      application.status = 'changes_requested';
    }

    if (!application.statusHistory) application.statusHistory = [];
    application.statusHistory.push({
      status: application.status,
      changedAt: new Date(),
      changedBy: user._id as mongoose.Types.ObjectId,
      reason: `Attorney review decision: ${reviewDecision}. Comments: ${comments || 'None'}`,
    });

    await application.save();

    res.status(200).json({
      success: true,
      message: `Review decision (${reviewDecision}) recorded successfully.`,
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record attorney review.',
    });
  }
};

export const requestMissingEvidence = async (
  req: ApplicationAuthorizedRequest,
  res: Response
): Promise<void> => {
  try {
    const application = req.application;
    const user = req.user;
    if (!application || !user) {
      res.status(400).json({ success: false, message: 'Application or user not found' });
      return;
    }

    // Explicit attorney assignment check
    if (
      user.role !== 'admin' &&
      (!application.assignedAttorneyId ||
        application.assignedAttorneyId.toString() !== user._id.toString())
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the assigned attorney for this case.',
      });
      return;
    }

    const { documentName, reason } = req.body;
    if (!documentName || !reason) {
      res.status(400).json({
        success: false,
        message: 'Document name and reason are required.',
      });
      return;
    }

    application.missingEvidenceRequests.push({
      documentName,
      reason,
      requestedAt: new Date(),
    });

    application.status = 'changes_requested';
    if (!application.statusHistory) application.statusHistory = [];
    application.statusHistory.push({
      status: 'changes_requested',
      changedAt: new Date(),
      changedBy: user._id as mongoose.Types.ObjectId,
      reason: `Missing evidence notice issued: ${documentName}`,
    });

    await application.save();

    res.status(200).json({
      success: true,
      message: `Evidence request for "${documentName}" created successfully.`,
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to request missing evidence.',
    });
  }
};
