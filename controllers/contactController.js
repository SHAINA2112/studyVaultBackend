import asyncHandler from 'express-async-handler';
import ContactMessage from '../models/ContactMessage.js';

/**
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  await ContactMessage.create({
    name,
    email: email.toLowerCase(),
    subject,
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully',
  });
});
