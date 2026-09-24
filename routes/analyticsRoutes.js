import express from 'express';
import {
  getOverview,
  getUserAnalytics,
  getDownloadAnalytics,
  getNoteAnalytics,
  getMessageAnalytics,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/overview', getOverview);
router.get('/users', getUserAnalytics);
router.get('/downloads', getDownloadAnalytics);
router.get('/notes', getNoteAnalytics);
router.get('/messages', getMessageAnalytics);

export default router;
