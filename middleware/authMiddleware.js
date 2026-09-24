import asyncHandler from 'express-async-handler';
import { verifyToken } from '../utils/generateToken.js';
import { ApiError } from './errorMiddleware.js';
import User from '../models/User.js';

/**
 * Verifies the JWT, loads the current user from the database (never trusts
 * the token payload alone for anything beyond identifying the user), confirms
 * the account is active, and attaches it to req.user for downstream handlers.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Not authorized, invalid or expired token');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'Not authorized, user no longer exists');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Contact support.');
  }

  // Always trust the DB record's role, not the token payload, for authorization.
  req.user = user;
  next();
});

/**
 * Optional auth: attaches req.user if a valid token is present, but does not
 * reject the request otherwise. Useful for endpoints like GET /api/notes/:id
 * where view-tracking differs for logged-in vs anonymous visitors.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return next();

  try {
    const decoded = verifyToken(authHeader.split(' ')[1]);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid/expired token on an optional-auth route — proceed as anonymous.
  }
  next();
});
