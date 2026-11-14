// backend/src/utils/file-signature.ts
// Secure File Signature (Magic Numbers) & Integrity Checksum Validation

import crypto from 'crypto';

export interface FileSignatureValidationResult {
  valid: boolean;
  detectedMime: string | null;
  detectedExt: string | null;
  error?: string;
}

/**
 * Validates the file buffer against known binary magic numbers.
 * Protects against MIME-type spoofing, executable cloaking, and corrupt files.
 */
export function validateFileSignature(buffer: Buffer): FileSignatureValidationResult {
  if (!buffer || buffer.length < 4) {
    return {
      valid: false,
      detectedMime: null,
      detectedExt: null,
      error: 'File buffer is too small or empty.',
    };
  }

  // 1. PDF Signature: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return {
      valid: true,
      detectedMime: 'application/pdf',
      detectedExt: '.pdf',
    };
  }

  // 2. PNG Signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      valid: true,
      detectedMime: 'image/png',
      detectedExt: '.png',
    };
  }

  // 3. JPEG/JPG Signature: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      valid: true,
      detectedMime: 'image/jpeg',
      detectedExt: '.jpg',
    };
  }

  // 4. DOCX Signature: PK\x03\x04 (0x50 0x4B 0x03 0x04) - OpenXML Zip Container
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    return {
      valid: true,
      detectedMime:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      detectedExt: '.docx',
    };
  }

  return {
    valid: false,
    detectedMime: null,
    detectedExt: null,
    error:
      'File signature does not match allowed types. Only genuine PDF, DOCX, PNG, and JPG files are accepted.',
  };
}

/**
 * Computes SHA-256 cryptographic digest for file integrity verification.
 */
export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

