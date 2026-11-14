// backend/src/routes/ai.routes.ts
// Express Router for AI Assistant, OCR Extraction, Grounded Q&A, and Inconsistency Analysis

import { Router } from 'express';
import {
  chatWithAI,
  getConversations,
  getConversationById,
  deleteConversation,
  extractDocumentData,
  getDocumentExtraction,
  summarizeDocument,
  analyzeCaseEvidence,
  getCaseFindings,
  reviewFinding,
  reviewExtractedField,
} from '../controllers/ai.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// 1. Conversational AI Assistant
router.post('/chat', authenticateUser, chatWithAI);
router.get('/conversations', authenticateUser, getConversations);
router.get('/conversations/:id', authenticateUser, getConversationById);
router.delete('/conversations/:id', authenticateUser, deleteConversation);

// 2. Document Text Extraction & OCR
router.post('/documents/:id/extract', authenticateUser, extractDocumentData);
router.get('/documents/:id/extraction', authenticateUser, getDocumentExtraction);

// 3. Document Summarization
router.post('/documents/:id/summarize', authenticateUser, summarizeDocument);

// 4. Evidence Analysis & Discrepancies
router.post('/analyze-evidence', authenticateUser, analyzeCaseEvidence);
router.get('/findings/:applicationId', authenticateUser, getCaseFindings);
router.patch('/findings/:id/review', authenticateUser, reviewFinding);

// 5. Human-in-the-Loop Field Verification
router.patch('/fields/:id/review', authenticateUser, reviewExtractedField);

export default router;

