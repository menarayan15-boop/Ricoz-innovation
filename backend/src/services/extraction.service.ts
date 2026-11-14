// backend/src/services/extraction.service.ts
// Robust Document Text Extraction & OCR Engine for PDF, DOCX, PNG, JPG

import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { DocumentModel, IDocumentRecord } from '../models/document.model.js';
import { DocumentExtraction, IDocumentExtraction } from '../models/extraction.model.js';
import { logger } from '../utils/logger.js';

export interface ExtractionResult {
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
  method: 'native_text' | 'ocr' | 'docx';
  ocrStatus: 'completed' | 'needs_review' | 'failed' | 'not_applicable';
  ocrConfidence?: number;
  wordCount: number;
}

class ExtractionService {
  /**
   * Main entrypoint to extract text from an authorized document record
   */
  public async extractDocumentText(
    doc: IDocumentRecord,
    buffer: Buffer
  ): Promise<ExtractionResult> {
    // 1. Check if extraction is already cached for this exact checksum
    const existing = await DocumentExtraction.findOne({
      checksum: doc.checksum,
    });

    if (existing && existing.extractedText.trim().length > 0) {
      logger.info(`[Extraction] Cache hit for document [${doc._id}], checksum [${doc.checksum.slice(0, 10)}]`);
      // Ensure record exists for this specific document instance as well
      await DocumentExtraction.findOneAndUpdate(
        { documentId: doc._id },
        {
          documentId: doc._id,
          applicationId: doc.applicationId,
          extractedText: existing.extractedText,
          pageCount: existing.pageCount,
          pages: existing.pages,
          extractionMethod: existing.extractionMethod,
          ocrStatus: existing.ocrStatus,
          ocrConfidence: existing.ocrConfidence,
          checksum: doc.checksum,
          wordCount: existing.wordCount,
        },
        { upsert: true, new: true }
      );
      return {
        text: existing.extractedText,
        pageCount: existing.pageCount,
        pages: existing.pages,
        method: existing.extractionMethod,
        ocrStatus: existing.ocrStatus as any,
        ocrConfidence: existing.ocrConfidence,
        wordCount: existing.wordCount,
      };
    }

    const mime = (doc.mimeType || '').toLowerCase();
    const ext = path.extname(doc.originalFilename).toLowerCase();
    let result: ExtractionResult;

    // 2. Select appropriate extraction strategy
    if (mime.includes('pdf') || ext === '.pdf') {
      result = await this.extractPdf(buffer);
    } else if (
      mime.includes('word') ||
      mime.includes('officedocument') ||
      ext === '.docx'
    ) {
      result = await this.extractDocx(buffer);
    } else if (
      mime.startsWith('image/') ||
      ['.png', '.jpg', '.jpeg'].includes(ext)
    ) {
      result = await this.extractImageOcr(buffer);
    } else {
      throw new Error(`Unsupported document format for text extraction: ${mime} (${ext})`);
    }

    // 3. Persist extraction in MongoDB
    await DocumentExtraction.findOneAndUpdate(
      { documentId: doc._id },
      {
        documentId: doc._id,
        applicationId: doc.applicationId,
        extractedText: result.text,
        pageCount: result.pageCount,
        pages: result.pages,
        extractionMethod: result.method,
        ocrStatus: result.ocrStatus,
        ocrConfidence: result.ocrConfidence,
        checksum: doc.checksum,
        wordCount: result.wordCount,
      },
      { upsert: true, new: true }
    );

    // 4. Update Document metadata in DocumentModel
    await DocumentModel.findByIdAndUpdate(doc._id, {
      'metadata.pageCount': result.pageCount,
      'metadata.ocrStatus': result.ocrStatus,
      'metadata.extractedText': result.text,
    });

    return result;
  }

  /**
   * PDF text extraction: native embedded text parsing with OCR fallback for scanned pages
   */
  private async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const pdfModule = await import('pdf-parse');
      let rawText = '';
      let pageCount = 1;
      let pages: Array<{ pageNumber: number; text: string }> = [];

      if ((pdfModule as any).PDFParse) {
        // Modern pdf-parse v2+ (Class-based architecture)
        const { PDFParse } = pdfModule as any;
        const parser = new PDFParse({ data: buffer });
        try {
          await parser.load();
          const parsed = await parser.getText();
          rawText = (parsed?.text || '').trim();
          pageCount = parsed?.total || 1;
          if (Array.isArray(parsed?.pages) && parsed.pages.length > 0) {
            pages = parsed.pages.map((p: any) => ({
              pageNumber: p.num || 1,
              text: (p.text || '').trim(),
            }));
          }
        } finally {
          try {
            await parser.destroy();
          } catch (_) {}
        }
      } else {
        // Fallback for legacy functional pdf-parse v1
        const pdfParse = (pdfModule as any).default || pdfModule;
        const pdfData = await pdfParse(buffer);
        rawText = (pdfData.text || '').trim();
        pageCount = pdfData.numpages || 1;
      }

      // If native text extraction succeeded with meaningful text
      if (rawText.length > 20) {
        if (pages.length === 0) {
          const sections = rawText.split(/\f|\n\s*\n\s*\n/);
          if (sections.length > 1) {
            sections.forEach((sec: string, idx: number) => {
              if (sec.trim()) {
                pages.push({ pageNumber: idx + 1, text: sec.trim() });
              }
            });
          } else {
            pages.push({ pageNumber: 1, text: rawText });
          }
        }

        const words = rawText.split(/\s+/).filter(Boolean).length;
        return {
          text: rawText,
          pageCount,
          pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
          method: 'native_text',
          ocrStatus: 'completed',
          wordCount: words,
        };
      }

      // If text is very short or empty, it is likely a scanned image PDF
      logger.info('[Extraction] PDF has minimal embedded text. Falling back to OCR processing.');
      return this.extractImageOcr(buffer);
    } catch (err) {
      logger.warn('[Extraction] Native PDF parse encountered issue, falling back to OCR:', err);
      return this.extractImageOcr(buffer);
    }
  }

  /**
   * Word (.docx) raw text extraction using mammoth
   */
  private async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      const cleanText = (value || '').trim();
      const words = cleanText.split(/\s+/).filter(Boolean).length;

      return {
        text: cleanText,
        pageCount: 1,
        pages: [{ pageNumber: 1, text: cleanText }],
        method: 'docx',
        ocrStatus: 'not_applicable',
        wordCount: words,
      };
    } catch (err) {
      logger.error('[Extraction] DOCX extraction error:', err);
      throw new Error(`Failed to extract text from DOCX: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Optical Character Recognition (OCR) for scanned images and documents
   */
  private async extractImageOcr(buffer: Buffer): Promise<ExtractionResult> {
    let worker: any = null;
    try {
      logger.info('[Extraction] Initializing Tesseract.js OCR worker...');
      worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      const text = (ret.data?.text || '').trim();
      const confidence = ret.data?.confidence || 0;
      const words = text.split(/\s+/).filter(Boolean).length;

      return {
        text,
        pageCount: 1,
        pages: [{ pageNumber: 1, text }],
        method: 'ocr',
        ocrStatus: confidence > 50 ? 'completed' : 'needs_review',
        ocrConfidence: confidence,
        wordCount: words,
      };
    } catch (err) {
      logger.error('[Extraction] OCR failed:', err);
      // Return safe fallback rather than crashing
      return {
        text: '',
        pageCount: 1,
        pages: [{ pageNumber: 1, text: '' }],
        method: 'ocr',
        ocrStatus: 'failed',
        wordCount: 0,
      };
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
    }
  }
}

export const extractionService = new ExtractionService();
