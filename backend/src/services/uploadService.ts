import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config';

// Allowed file types for security
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function ensure(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Sanitize filename to prevent directory traversal
function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  const sanitized = filename
    .replace(/[/\\]/g, '-')
    .replace(/\0/g, '')
    .replace(/\.\./g, '-');
  
  // Extract extension safely
  const ext = path.extname(sanitized).toLowerCase();
  const base = path.basename(sanitized, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .substring(0, 100); // Limit filename length
  
  return `${Date.now()}-${base}${ext}`;
}

// File filter to validate file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  // Validate both MIME type and extension to prevent bypass
  if (ALLOWED_MIME_TYPES.includes(mimeType) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
};

export function diskStorageFor(folder: string) {
  const dest = path.join(config.UPLOADS_DIR, folder);
  ensure(dest);
  
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname))
  });
}

// Create upload middleware with security constraints
export function createUploader(folder: string) {
  return multer({
    storage: diskStorageFor(folder),
    fileFilter: fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1 // Single file upload
    }
  });
}
