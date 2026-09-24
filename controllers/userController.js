import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Bookmark from '../models/Bookmark.js';
import Note from '../models/Note.js';
import { ApiError } from '../middleware/errorMiddleware.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/storageService.js';

/**
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile fetched',
    data: { user: req.user.toJSON() },
  });
});

/**
 * @route   PUT /api/users/profile
 * @access  Private
 * Students can only ever touch their own editable fields. `role` and
 * `isActive` are never read from the request body, no matter what is sent.
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const editableFields = ['name', 'username', 'university', 'semester', 'bio'];
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  if (req.body.username && req.body.username.toLowerCase() !== user.username) {
    const taken = await User.findOne({ username: req.body.username.toLowerCase() });
    if (taken) throw new ApiError(409, 'That username is already taken');
  }

  for (const field of editableFields) {
    if (req.body[field] !== undefined) {
      user[field] = field === 'username' ? String(req.body[field]).toLowerCase() : req.body[field];
    }
  }

  // Optional profile image upload (multipart, field name "profileImage").
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'shaina-studyvault/profile-images',
      resourceType: 'image',
    });
    user.profileImage = result.secure_url;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: user.toJSON() },
  });
});

/**
 * @route   PATCH /api/users/password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @route   GET /api/users/bookmarks
 * @access  Private
 */
export const getMyBookmarks = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 100);
  const skip = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    Bookmark.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'note', match: { isPublished: true } }),
    Bookmark.countDocuments({ user: req.user._id }),
  ]);

  const notes = bookmarks.filter((b) => b.note).map((b) => ({ ...b.note.toObject(), bookmarkedAt: b.createdAt }));

  res.status(200).json({
    success: true,
    message: 'Bookmarks fetched',
    data: {
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});
