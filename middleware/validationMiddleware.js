import { validationResult } from 'express-validator';

/**
 * Runs after an array of express-validator chains. Collects errors and
 * returns a single, clean 400 response instead of letting each route
 * handle validationResult itself.
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const messages = errors.array().map((e) => e.msg);
  return res.status(400).json({
    success: false,
    message: messages[0] || 'Invalid input',
    errors: messages,
  });
}
