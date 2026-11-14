// backend/src/middleware/upload.middleware.ts
// Multer Upload Middleware with Configurable Size Limits

import multer from 'multer';

// Initial configurable file size limit: 20MB default
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed declared MIME types (further validated via binary file signatures)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type (${file.mimetype}). Only PDF, PNG, JPG, and DOCX files are accepted.`
      )
    );
  }
};

// Memory storage allows server-side binary magic number inspection & SHA-256 checksum calculation
// before committing the file to private object storage.
const storage = multer.memoryStorage();

export const documentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Maximum 5 files per single upload request
  },
});

export { MAX_FILE_SIZE, MAX_FILE_SIZE_MB };
