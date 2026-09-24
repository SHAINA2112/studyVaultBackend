import express from 'express';
import {
  createNote,
  updateNote,
  deleteNote,
  setNotePublishState,
  getAdminNotes,
  getUsers,
  getUserById,
  setUserStatus,
  getMessages,
  getMessageStats,
  getMessageById,
  markMessageRead,
  markMessageUnread,
  deleteMessage,
  replyToMessage,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import { uploadNoteFiles } from '../middleware/uploadMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { noteCreateValidator, mongoIdParamValidator, replyMessageValidator } from '../utils/validators.js';

const router = express.Router();

// Every route below requires a valid token AND role === 'admin' from the DB.
// This is enforced here, not in the frontend, so it can't be bypassed.
router.use(protect, adminOnly);

/* ---------------------------- Notes ---------------------------- */
router.get('/notes', getAdminNotes);
router.post('/notes', uploadNoteFiles, noteCreateValidator, validate, createNote);
router.put('/notes/:id', mongoIdParamValidator(), validate, uploadNoteFiles, updateNote);
router.delete('/notes/:id', mongoIdParamValidator(), validate, deleteNote);
router.patch('/notes/:id/publish', mongoIdParamValidator(), validate, setNotePublishState);

/* ---------------------------- Users ----------------------------- */
router.get('/users', getUsers);
router.get('/users/:id', mongoIdParamValidator(), validate, getUserById);
router.patch('/users/:id/status', mongoIdParamValidator(), validate, setUserStatus);

/* --------------------------- Messages --------------------------- */
router.get('/messages', getMessages);
router.get('/messages/stats', getMessageStats);
router.get('/messages/:id', mongoIdParamValidator(), validate, getMessageById);
router.patch('/messages/:id/read', mongoIdParamValidator(), validate, markMessageRead);
router.patch('/messages/:id/unread', mongoIdParamValidator(), validate, markMessageUnread);
router.post('/messages/:id/reply', mongoIdParamValidator(), validate, replyMessageValidator, validate, replyToMessage);
router.delete('/messages/:id', mongoIdParamValidator(), validate, deleteMessage);

export default router;
