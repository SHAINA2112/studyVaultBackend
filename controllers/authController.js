import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { ApiError } from '../middleware/errorMiddleware.js';
import { sendEmail, passwordResetTemplate } from '../services/emailService.js';

function publicUser(user) {
  // toJSON transform already strips password/reset fields.
  return user.toJSON ? user.toJSON() : user;
}

/**
 * @route   POST /api/auth/register
 * @access  Public
 * Every registration creates a STUDENT. Any `role` field sent by the client
 * is deliberately never read, so nobody can register themselves as admin.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) throw new ApiError(409, 'An account with that email already exists');

  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) throw new ApiError(409, 'That username is already taken');

  // role is intentionally hardcoded — req.body.role is never read.
  const user = await User.create({
    name,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    role: 'student',
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user: publicUser(user), token },
  });
});

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Contact support.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: { user: publicUser(user), token },
  });
});

/**
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Current user fetched',
    data: { user: publicUser(req.user) },
  });
});

/**
 * @route   POST /api/auth/forgot-password
 * @access  Public
 * Always responds with a generic success message, whether or not the email
 * exists, so the endpoint can't be used to enumerate registered accounts.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  const genericResponse = {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  };

  if (!user) return res.status(200).json(genericResponse);

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your SHAINA StudyVault password',
      html: passwordResetTemplate({ name: user.name, resetUrl }),
      text: `Reset your password: ${resetUrl} (expires in 30 minutes)`,
    });
  } catch (err) {
    // Roll back the token if the email genuinely failed to send.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Could not send password reset email. Please try again later.');
  }

  res.status(200).json(genericResponse);
});

/**
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new ApiError(400, 'Password reset link is invalid or has expired');

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const authToken = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully',
    data: { user: publicUser(user), token: authToken },
  });
});
