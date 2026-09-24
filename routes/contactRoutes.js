import express from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactMessage } from '../controllers/contactController.js';
import { validate } from '../middleware/validationMiddleware.js';
import { contactValidator } from '../utils/validators.js';

const router = express.Router();

// Prevent contact-form spam floods.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages sent, please try again later' },
});

router.post('/', contactLimiter, contactValidator, validate, submitContactMessage);

export default router;
