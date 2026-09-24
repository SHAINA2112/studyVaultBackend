import express from 'express';
import { addBookmark, removeBookmark } from '../controllers/bookmarkController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { mongoIdParamValidator } from '../utils/validators.js';

const router = express.Router();

// Mounted under /api/notes in noteRoutes.js, so final paths are
// POST /api/notes/:id/bookmark and DELETE /api/notes/:id/bookmark
router.post('/:id/bookmark', mongoIdParamValidator(), validate, protect, addBookmark);
router.delete('/:id/bookmark', mongoIdParamValidator(), validate, protect, removeBookmark);

export default router;
