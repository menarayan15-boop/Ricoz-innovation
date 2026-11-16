// backend/src/controllers/dossier.controller.ts
// Controller for Phase 8: Dossier Automation, Case Readiness Scoring,
// Grounded AI Summaries, Attorney Review Workflows, and Professional PDF Exports.

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DossierModel } from '../models/dossier.model.js';
import { Application } from '../models/application.model.js';
import { DocumentModel } from '../models/document.model.js';
import { dossierService } from '../services/dossier.service.js';
import { logger } from '../utils/logger.js';

export class DossierController {
  /**
   * POST /api/v1/applications/:id/dossier/generate
   * Generates or increments a new structured dossier draft with readiness score & AI summary
   */
  public async generateDossier(req: Request, res: Response): Promise<void> {
    try {
      const { id: applicationId } = req.params;
      const user = (req as any).user;

      if (!Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({ success: false, message: 'Invalid application ID.' });
        return;
      }

      const dossier = await dossierService.generateDossierDraft(
        applicationId,
        user.id || user._id,
        user.role
      );

      res.status(201).json({
        success: true,
        message: `Dossier version ${dossier.version} assembled successfully with readiness score ${dossier.readinessScore.overallScore}/100.`,
        dossier,
      });
    } catch (error: any) {
      logger.error('[DossierController] Generate dossier failed:', error);
      const statusCode = error.message?.includes('Access denied') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to generate dossier draft.',
      });
    }
  }

  /**
   * GET /api/v1/applications/:id/dossier
   * Retrieves the latest active dossier draft and version history for a petition
   */
  public async getDossierByApplication(req: Request, res: Response): Promise<void> {
    try {
      const { id: applicationId } = req.params;
      const user = (req as any).user;

      if (!Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({ success: false, message: 'Invalid application ID.' });
        return;
      }

      const app = await Application.findById(applicationId);
      if (!app) {
        res.status(404).json({ success: false, message: 'Visa application not found.' });
        return;
      }

      // Check authorization
      const isOwner = app.applicantId.toString() === (user.id || user._id).toString();
      const isAssigned = app.assignedAttorneyId?.toString() === (user.id || user._id).toString();
      const isStaff = user.role === 'attorney' || user.role === 'admin';
      if (!isOwner && !isAssigned && !isStaff) {
        res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view dossiers for this petition.' });
        return;
      }

      const versions = await DossierModel.find({ applicationId }).sort({ version: -1 });
      const currentDossier = versions.length > 0 ? versions[0] : null;

      res.status(200).json({
        success: true,
        dossier: currentDossier,
        history: versions.map((v) => ({
          dossierId: v.dossierId,
          version: v.version,
          status: v.status,
          readinessScore: v.readinessScore.overallScore,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
      });
    } catch (error: any) {
      logger.error('[DossierController] Get dossier by application failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dossier record.',
      });
    }
  }

  /**
   * GET /api/v1/applications/:id/dossier/readiness
   * Real-time calculation of explainable Case Readiness Score
   */
  public async getReadinessScore(req: Request, res: Response): Promise<void> {
    try {
      const { id: applicationId } = req.params;
      const user = (req as any).user;

      if (!Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({ success: false, message: 'Invalid application ID.' });
        return;
      }

      const app = await Application.findById(applicationId);
      if (!app) {
        res.status(404).json({ success: false, message: 'Visa application not found.' });
        return;
      }

      // Check authorization
      const isOwner = app.applicantId.toString() === (user.id || user._id).toString();
      const isAssigned = app.assignedAttorneyId?.toString() === (user.id || user._id).toString();
      const isStaff = user.role === 'attorney' || user.role === 'admin';
      if (!isOwner && !isAssigned && !isStaff) {
        res.status(403).json({ success: false, message: 'Access denied to petition readiness metrics.' });
        return;
      }

      const documents = await DocumentModel.find({
        applicationId,
        deletedAt: null,
      });

      const readinessScore = await dossierService.calculateReadinessScore(app, documents);

      res.status(200).json({
        success: true,
        readinessScore,
      });
    } catch (error: any) {
      logger.error('[DossierController] Get readiness score failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate case readiness score.',
      });
    }
  }

  /**
   * GET /api/v1/dossier/:dossierId
   * Retrieves a specific dossier by its business ID
   */
  public async getDossierById(req: Request, res: Response): Promise<void> {
    try {
      const { dossierId } = req.params;
      const user = (req as any).user;

      const dossier = await DossierModel.findOne(
        Types.ObjectId.isValid(dossierId) ? { $or: [{ dossierId }, { _id: dossierId }] } : { dossierId }
      );
      if (!dossier) {
        res.status(404).json({ success: false, message: `Dossier [${dossierId}] not found.` });
        return;
      }

      const app = await Application.findById(dossier.applicationId);
      if (app) {
        const isOwner = app.applicantId.toString() === (user.id || user._id).toString();
        const isAssigned = app.assignedAttorneyId?.toString() === (user.id || user._id).toString();
        const isStaff = user.role === 'attorney' || user.role === 'admin';
        if (!isOwner && !isAssigned && !isStaff) {
          res.status(403).json({ success: false, message: 'Access denied to this dossier record.' });
          return;
        }
      }

      res.status(200).json({
        success: true,
        dossier,
      });
    } catch (error: any) {
      logger.error('[DossierController] Get dossier by ID failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dossier.',
      });
    }
  }

  /**
   * PATCH /api/v1/dossier/:dossierId/summary
   * Allows authorized user/attorney to refine the AI Case Summary narrative
   */
  public async editAiSummary(req: Request, res: Response): Promise<void> {
    try {
      const { dossierId } = req.params;
      const { overview, evidenceSummary } = req.body;
      const user = (req as any).user;

      if (!overview && !evidenceSummary) {
        res.status(400).json({
          success: false,
          message: 'At least one of overview or evidenceSummary is required to update.',
        });
        return;
      }

      const dossier = await dossierService.editAiSummary(
        dossierId,
        user.id || user._id,
        user.role,
        overview,
        evidenceSummary
      );

      res.status(200).json({
        success: true,
        message: 'AI Case Summary successfully updated with human revisions.',
        dossier,
      });
    } catch (error: any) {
      logger.error('[DossierController] Edit AI summary failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update AI summary.',
      });
    }
  }

  /**
   * PATCH /api/v1/dossier/:dossierId/review
   * Attorney adjudication: approve, request changes, or reject draft
   */
  public async reviewDossier(req: Request, res: Response): Promise<void> {
    try {
      const { dossierId } = req.params;
      const { decision, comments, reviewNotes, requestedEvidence } = req.body;
      const user = (req as any).user;

      if (!['approved', 'changes_requested', 'rejected'].includes(decision)) {
        res.status(400).json({
          success: false,
          message: 'Invalid review decision. Valid values: approved, changes_requested, rejected.',
        });
        return;
      }

      const dossier = await dossierService.submitAttorneyReview(
        dossierId,
        user.id || user._id,
        user.name || 'Assigned Counsel',
        user.role,
        decision,
        reviewNotes || comments || '',
        requestedEvidence
      );

      res.status(200).json({
        success: true,
        message: `Attorney adjudication recorded: ${decision}.`,
        dossier,
      });
    } catch (error: any) {
      logger.error('[DossierController] Attorney review failed:', error);
      const statusCode = error.message?.includes('Authorization error') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit attorney review.',
      });
    }
  }

  /**
   * POST /api/v1/dossier/:dossierId/finalize
   * Locks and finalizes an attorney-approved dossier for submission packaging
   */
  public async finalizeDossier(req: Request, res: Response): Promise<void> {
    try {
      const { dossierId } = req.params;
      const user = (req as any).user;

      const dossier = await dossierService.finalizeDossier(
        dossierId,
        user.id || user._id,
        user.role
      );

      res.status(200).json({
        success: true,
        message: 'Dossier finalized and locked for official filing.',
        dossier,
      });
    } catch (error: any) {
      logger.error('[DossierController] Finalize dossier failed:', error);
      const statusCode = error.message?.includes('Authorization error') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to finalize dossier.',
      });
    }
  }

  /**
   * GET /api/v1/dossier/:dossierId/pdf
   * Generates and streams publication-ready, Bates-numbered PDF packet
   */
  public async exportDossierPdf(req: Request, res: Response): Promise<void> {
    try {
      const { dossierId } = req.params;
      const user = (req as any).user;

      const dossier = await DossierModel.findOne(
        Types.ObjectId.isValid(dossierId) ? { $or: [{ dossierId }, { _id: dossierId }] } : { dossierId }
      );
      if (!dossier) {
        res.status(404).json({ success: false, message: `Dossier [${dossierId}] not found.` });
        return;
      }

      const app = await Application.findById(dossier.applicationId);
      if (app) {
        const isOwner = app.applicantId.toString() === (user.id || user._id).toString();
        const isAssigned = app.assignedAttorneyId?.toString() === (user.id || user._id).toString();
        const isStaff = user.role === 'attorney' || user.role === 'admin';
        if (!isOwner && !isAssigned && !isStaff) {
          res.status(403).json({ success: false, message: 'Access denied: You cannot export this dossier PDF.' });
          return;
        }
      }

      const pdfBuffer = await dossierService.generateDossierPdf(dossier);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dossier.dossierId}_Exhibit_Dossier.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.status(200).send(pdfBuffer);
    } catch (error: any) {
      logger.error('[DossierController] Export PDF failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export dossier PDF.',
      });
    }
  }
}

export const dossierController = new DossierController();
