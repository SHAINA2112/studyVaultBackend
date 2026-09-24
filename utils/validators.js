import { body, query, param } from 'express-validator';

// Shared password-strength rule: 8+ chars, at least one letter and one number.
const strongPassword = (field = 'password') =>
  body(field)
    .isLength({ min: 8 })
    .withMessage(`${field} must be at least 8 characters`)
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .withMessage(`${field} must contain at least one letter and one number`);

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('username')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-z0-9_.]+$/)
    .withMessage('Username can only contain lowercase letters, numbers, dots and underscores'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  strongPassword('password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

export const loginValidator = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [body('email').trim().notEmpty().isEmail().withMessage('Please provide a valid email')];

export const resetPasswordValidator = [strongPassword('password')];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  strongPassword('newPassword'),
];

export const updateProfileValidator = [
  body('name').optional().trim().isLength({ max: 80 }),
  body('username')
    .optional()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-z0-9_.]+$/)
    .withMessage('Username can only contain lowercase letters, numbers, dots and underscores'),
  body('university').optional().trim().isLength({ max: 120 }),
  body('semester').optional().trim().isLength({ max: 20 }),
  body('bio').optional().trim().isLength({ max: 300 }),
  // role / isActive are intentionally not accepted here — see userController.
];

export const contactValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email'),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 150 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 4000 }),
];

export const replyMessageValidator = [
  body('message').trim().notEmpty().withMessage('Reply message is required').isLength({ max: 4000 }),
];

export const noteCreateValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('semester').trim().notEmpty().withMessage('Semester is required'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['Lecture Notes', 'Past Papers', 'Lab Manual', 'Cheat Sheet', 'Assignment', 'Book Summary'])
    .withMessage('Invalid category'),
];

export const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const mongoIdParamValidator = (field = 'id') =>
  param(field).isMongoId().withMessage(`Invalid ${field}`);
