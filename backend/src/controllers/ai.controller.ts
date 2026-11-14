// backend/src/controllers/ai.controller.ts
// AI Assistant, RAG Grounding, OCR Processing & Inconsistency Intelligence Controller

import { Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AIConversation, AIMessage } from '../models/ai-conversation.model.js';
import {
  DocumentExtraction,
  ExtractedField,
  EvidenceFinding,
} from '../models/extraction.model.js';
import { DocumentModel } from '../models/document.model.js';
import { Application } from '../models/application.model.js';
import { aiService } from '../services/ai.service.js';
import { extractionService } from '../services/extraction.service.js';
import { logger } from '../utils/logger.js';

// Helper to verify user access to application
async function verifyAppAccess(appId: string, user: any) {
  if (!mongoose.Types.ObjectId.isValid(appId)) return null;
  const app = await Application.findById(appId);
  if (!app) return null;
  if (user.role === 'admin') return app;
  const isOwner = app.applicantId.toString() === user._id.toString();
  const isAttorney = app.assignedAttorneyId && app.assignedAttorneyId.toString() === user._id.toString();
  const isEmployer = app.employerId && app.employerId.toString() === user._id.toString();
  if (isOwner || isAttorney || isEmployer) return app;
  return null;
}

// =========================================================================
// 1. CONVERSATIONAL AI CHAT (RAG WITH SOURCE CITATIONS)
// =========================================================================
export const chatWithAI = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { conversationId, message, applicationId, attachedDocumentIds } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, message: 'Message content is required.' });
      return;
    }

    // 1. Verify or create Conversation
    let conversation = null;
    let convId = conversationId;

    if (convId) {
      conversation = await AIConversation.findOne({ conversationId: convId, userId: user._id });
    }

    if (!conversation) {
      convId = crypto.randomUUID();
      const title = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      conversation = await AIConversation.create({
        conversationId: convId,
        userId: user._id,
        applicationId: applicationId && mongoose.Types.ObjectId.isValid(applicationId) ? applicationId : undefined,
        title,
        lastMessageAt: new Date(),
      });
    } else {
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    // 2. Fetch recent conversation context (last 6 messages)
    const recentMessages = await AIMessage.find({ conversationId: convId })
      .sort({ createdAt: -1 })
      .limit(6);
    recentMessages.reverse();

    const formattedHistory = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
    formattedHistory.push({ role: 'user', content: message });

    // 3. Retrieve Context Documents (RAG)
    const contextDocs: Array<{ id: string; name: string; text: string; category?: string }> = [];

    // Documents specifically attached or from active application
    const targetAppId = applicationId || conversation.applicationId;
    if (targetAppId && mongoose.Types.ObjectId.isValid(targetAppId)) {
      const app = await verifyAppAccess(targetAppId.toString(), user);
      if (app) {
        let docFilter: Record<string, unknown> = {
          applicationId: app._id,
          isCurrentVersion: true,
          deletedAt: null,
        };

        if (Array.isArray(attachedDocumentIds) && attachedDocumentIds.length > 0) {
          docFilter._id = { $in: attachedDocumentIds };
        }

        const caseDocs = await DocumentModel.find(docFilter).limit(5);

        for (const doc of caseDocs) {
          let extraction = await DocumentExtraction.findOne({ documentId: doc._id });
          // If not extracted yet, perform on-the-fly text extraction
          if (!extraction && fs.existsSync(doc.storagePath)) {
            try {
              const fileBuf = await fs.promises.readFile(doc.storagePath);
              const extRes = await extractionService.extractDocumentText(doc, fileBuf);
              extraction = await DocumentExtraction.findOne({ documentId: doc._id });
            } catch (err) {
              logger.warn(`Could not extract doc [${doc._id}] for chat context:`, err);
            }
          }

          if (extraction && extraction.extractedText) {
            contextDocs.push({
              id: doc._id.toString(),
              name: doc.title || doc.originalFilename,
              text: extraction.extractedText,
              category: doc.category,
            });
          }
        }
      }
    }

    // 4. Save User Message
    await AIMessage.create({
      conversationId: convId,
      userId: user._id,
      role: 'user',
      content: message,
      citations: [],
    });

    // 5. Generate AI Response
    const aiResponse = await aiService.generateChatResponse(formattedHistory, contextDocs);

    // 6. Save Assistant Response with Citations
    const assistantMsg = await AIMessage.create({
      conversationId: convId,
      userId: user._id,
      role: 'assistant',
      content: aiResponse.content,
      citations: aiResponse.citations.map((c) => ({
        documentId: new mongoose.Types.ObjectId(c.documentId),
        documentName: c.documentName,
        quoteExcerpt: c.quoteExcerpt,
      })),
    });

    res.status(200).json({
      success: true,
      conversationId: convId,
      message: assistantMsg,
      conversation,
    });
  } catch (error: any) {
    logger.error('Chat AI Controller Error:', error);
    const isServiceUnavailable =
      error.message?.includes('not configured') ||
      error.message?.includes('Quota') ||
      error.message?.includes('credits remaining') ||
      error.message?.includes('Rate Limit');
    res.status(isServiceUnavailable ? 503 : 500).json({
      success: false,
      message: error.message || 'Failed to process AI chat inquiry.',
    });
  }
};

// =========================================================================
// 2. CONVERSATION MANAGEMENT (LIST, GET, DELETE)
// =========================================================================
export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { applicationId } = req.query;
    const filter: Record<string, unknown> = { userId: user._id };
    if (applicationId && mongoose.Types.ObjectId.isValid(applicationId as string)) {
      filter.applicationId = applicationId;
    }

    const conversations = await AIConversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve conversations.' });
  }
};

export const getConversationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const conversation = await AIConversation.findOne({ conversationId: id, userId: user?._id });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    const messages = await AIMessage.find({ conversationId: id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve conversation messages.' });
  }
};

export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const conversation = await AIConversation.findOneAndDelete({
      conversationId: id,
      userId: user?._id,
    });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    await AIMessage.deleteMany({ conversationId: id });

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete conversation.' });
  }
};

// =========================================================================
// 3. DOCUMENT TEXT EXTRACTION & STRUCTURED FIELD PARSING
// =========================================================================
export const extractDocumentData = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid document ID.' });
      return;
    }

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const app = await verifyAppAccess(doc.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    if (!fs.existsSync(doc.storagePath)) {
      res.status(404).json({ success: false, message: 'File is missing from storage.' });
      return;
    }

    // 1. Text Extraction & OCR
    const fileBuffer = await fs.promises.readFile(doc.storagePath);
    const extractionResult = await extractionService.extractDocumentText(doc, fileBuffer);

    // 2. Structured Entity Extraction via AI (non-blocking for basic OCR)
    let structuredFields: any[] = [];
    let aiNotice: string | undefined;
    try {
      structuredFields = await aiService.extractStructuredFields(
        extractionResult.text,
        doc.title || doc.originalFilename,
        app.visaCategory
      );
    } catch (aiErr: any) {
      logger.warn('AI structured field extraction unavailable:', aiErr.message);
      aiNotice = aiErr.message;
    }

    // 3. Upsert extracted fields into ExtractedField collection
    const createdFields = [];
    for (const field of structuredFields) {
      const saved = await ExtractedField.findOneAndUpdate(
        { documentId: doc._id, fieldName: field.fieldName },
        {
          documentId: doc._id,
          applicationId: doc.applicationId,
          category: field.category,
          fieldName: field.fieldName,
          fieldValue: field.fieldValue,
          quoteExcerpt: field.quoteExcerpt,
          confidence: field.confidence,
        },
        { upsert: true, new: true }
      );
      createdFields.push(saved);
    }

    res.status(200).json({
      success: true,
      message: aiNotice
        ? `Document text extracted successfully (${extractionResult.wordCount} words). ${aiNotice}`
        : `Extraction completed. Extracted ${extractionResult.wordCount} words and ${createdFields.length} structured fields.`,
      extraction: extractionResult,
      fields: createdFields,
      aiNotice,
    });
  } catch (error: any) {
    logger.error('Document extraction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract text from document.',
    });
  }
};

export const getDocumentExtraction = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const app = await verifyAppAccess(doc.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const extraction = await DocumentExtraction.findOne({ documentId: id });
    const fields = await ExtractedField.find({ documentId: id });

    res.status(200).json({
      success: true,
      extraction,
      fields,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve extraction.' });
  }
};

// =========================================================================
// 4. DOCUMENT SUMMARIZATION
// =========================================================================
export const summarizeDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    const doc = await DocumentModel.findById(id);
    if (!doc || doc.deletedAt) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const app = await verifyAppAccess(doc.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    // Ensure extraction exists
    let extraction = await DocumentExtraction.findOne({ documentId: id });
    if (!extraction) {
      if (!fs.existsSync(doc.storagePath)) {
        res.status(404).json({ success: false, message: 'Document file missing from disk.' });
        return;
      }
      const buffer = await fs.promises.readFile(doc.storagePath);
      await extractionService.extractDocumentText(doc, buffer);
      extraction = await DocumentExtraction.findOne({ documentId: id });
    }

    if (!extraction || !extraction.extractedText.trim()) {
      res.status(400).json({
        success: false,
        message: 'No readable text available in this document to summarize.',
      });
      return;
    }

    const summaryResult = await aiService.summarizeDocument(
      extraction.extractedText,
      doc.title || doc.originalFilename,
      doc.category
    );

    res.status(200).json({
      success: true,
      documentId: id,
      summary: summaryResult.summary,
      keyPoints: summaryResult.keyPoints,
    });
  } catch (error: any) {
    logger.error('Document summarization error:', error);
    const isServiceUnavailable =
      error.message?.includes('not configured') ||
      error.message?.includes('Quota') ||
      error.message?.includes('credits remaining') ||
      error.message?.includes('Rate Limit');
    res.status(isServiceUnavailable ? 503 : 500).json({
      success: false,
      message: error.message || 'Failed to summarize document.',
    });
  }
};

// =========================================================================
// 5. EVIDENCE INCONSISTENCY & DISCREPANCY ANALYSIS
// =========================================================================
export const analyzeCaseEvidence = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { applicationId } = req.body;

    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      res.status(400).json({ success: false, message: 'Valid applicationId is required.' });
      return;
    }

    const app = await verifyAppAccess(applicationId, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied to application.' });
      return;
    }

    // 1. Gather all extracted fields for this application
    const allFields = await ExtractedField.find({ applicationId: app._id });

    // 2. Run preliminary AI analysis
    const findings = await aiService.analyzeEvidenceInconsistencies(
      allFields.map((f) => ({
        category: f.category,
        fieldName: f.fieldName,
        fieldValue: f.fieldValue,
        confidence: f.confidence,
      })),
      {
        visaCategory: app.visaCategory,
        title: app.title,
        applicantName: app.applicantDetails?.fullName,
      }
    );

    // 3. Upsert findings
    const savedFindings = [];
    for (const f of findings) {
      const record = await EvidenceFinding.findOneAndUpdate(
        { applicationId: app._id, title: f.title },
        {
          applicationId: app._id,
          findingType: f.findingType,
          title: f.title,
          explanation: f.explanation,
          severity: f.severity,
          status: 'detected',
        },
        { upsert: true, new: true }
      );
      savedFindings.push(record);
    }

    res.status(200).json({
      success: true,
      count: savedFindings.length,
      findings: savedFindings,
    });
  } catch (error: any) {
    logger.error('Case evidence analysis error:', error);
    const isServiceUnavailable =
      error.message?.includes('not configured') ||
      error.message?.includes('Quota') ||
      error.message?.includes('credits remaining') ||
      error.message?.includes('Rate Limit');
    res.status(isServiceUnavailable ? 503 : 500).json({
      success: false,
      message: error.message || 'Failed to analyze case evidence.',
    });
  }
};

export const getCaseFindings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { applicationId } = req.params;

    const app = await verifyAppAccess(applicationId, user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const findings = await EvidenceFinding.find({ applicationId: app._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: findings.length,
      findings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve findings.' });
  }
};

// =========================================================================
// 6. HUMAN-IN-THE-LOOP VERIFICATION & FIELD CORRECTIONS
// =========================================================================
export const reviewExtractedField = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, humanCorrection } = req.body;

    const validStatuses = ['unverified', 'confirmed', 'corrected', 'dismissed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid verification status.' });
      return;
    }

    const field = await ExtractedField.findById(id);
    if (!field) {
      res.status(404).json({ success: false, message: 'Field not found.' });
      return;
    }

    const app = await verifyAppAccess(field.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    field.verificationStatus = status;
    if (humanCorrection !== undefined) field.humanCorrection = humanCorrection;
    field.reviewedBy = user?._id;
    field.reviewedAt = new Date();
    await field.save();

    res.status(200).json({
      success: true,
      message: `Field verification status updated to "${status}".`,
      field,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update field status.' });
  }
};

export const reviewFinding = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['detected', 'acknowledged', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status.' });
      return;
    }

    const finding = await EvidenceFinding.findById(id);
    if (!finding) {
      res.status(404).json({ success: false, message: 'Finding not found.' });
      return;
    }

    const app = await verifyAppAccess(finding.applicationId.toString(), user);
    if (!app) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    finding.status = status;
    finding.resolvedBy = user?._id;
    finding.resolvedAt = new Date();
    await finding.save();

    res.status(200).json({
      success: true,
      message: `Evidence finding marked as "${status}".`,
      finding,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to review finding.' });
  }
};
