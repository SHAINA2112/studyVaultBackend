import multer from 'multer';
import { ApiError } from './errorMiddleware.js';

// Files are held in memory only long enough to stream them to Cloudinary —
// never written to disk, never stored in MongoDB.
const storage = multer.memoryStorage();

const MAX_DOCUMENT_SIZE_MB = 25;
const MAX_THUMBNAIL_SIZE_MB = 5;

const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileFilter(req, file, cb) {
  if (file.fieldname === 'document') {
    if (!ALLOWED_DOCUMENT_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Document must be a PDF or Word file'));
    }
  }
  if (file.fieldname === 'thumbnail') {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Thumbnail must be a JPEG, PNG or WEBP image'));
    }
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_MB * 1024 * 1024, // multer applies the same limit per-file; document is the larger one
  },
});

// Used on note create/update: accepts one `document` and one optional `thumbnail`.
export const uploadNoteFiles = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

export const uploadProfileImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Profile image must be a JPEG, PNG or WEBP image'));
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_THUMBNAIL_SIZE_MB * 1024 * 1024 },
}).single('profileImage');

export const LIMITS = { MAX_DOCUMENT_SIZE_MB, MAX_THUMBNAIL_SIZE_MB };
