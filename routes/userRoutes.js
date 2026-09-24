import express from 'express';
import { getProfile, updateProfile, changePassword, getMyBookmarks } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProfileImage } from '../middleware/uploadMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { updateProfileValidator, changePasswordValidator } from '../utils/validators.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', uploadProfileImage, updateProfileValidator, validate, updateProfile);
router.patch('/password', changePasswordValidator, validate, changePassword);
router.get('/bookmarks', getMyBookmarks);

export default router;
