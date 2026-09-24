import express from 'express';
import { getNotes, getNoteById, readNote, downloadNote, getNoteFilters } from '../controllers/noteController.js';
import bookmarkRoutes from './bookmarkRoutes.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { paginationValidator, mongoIdParamValidator } from '../utils/validators.js';

const router = express.Router();

// Public browsing — no student upload endpoint exists anywhere in this router.
router.get('/', paginationValidator, validate, getNotes);
router.get('/meta/filters', getNoteFilters);
router.get('/:id', mongoIdParamValidator(), validate, optionalAuth, getNoteById);
router.get('/:id/read', mongoIdParamValidator(), validate, optionalAuth, readNote);

// Requires authentication (any logged-in user, student or admin).
router.get('/:id/download', mongoIdParamValidator(), validate, protect, downloadNote);

// Bookmark endpoints live in their own router, mounted at the same base path
// so the public API surface stays /api/notes/:id/bookmark.
router.use('/', bookmarkRoutes);

export default router;
