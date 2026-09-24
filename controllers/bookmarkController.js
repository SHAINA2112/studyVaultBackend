import asyncHandler from 'express-async-handler';
import Bookmark from '../models/Bookmark.js';
import Note from '../models/Note.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * @route   POST /api/notes/:id/bookmark
 * @access  Private
 */
export const addBookmark = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) throw new ApiError(404, 'Note not found');

  const existing = await Bookmark.findOne({ user: req.user._id, note: note._id });
  if (existing) throw new ApiError(409, 'Note is already bookmarked');

  await Bookmark.create({ user: req.user._id, note: note._id });

  res.status(201).json({
    success: true,
    message: 'Note bookmarked',
  });
});

/**
 * @route   DELETE /api/notes/:id/bookmark
 * @access  Private
 */
export const removeBookmark = asyncHandler(async (req, res) => {
  const deleted = await Bookmark.findOneAndDelete({ user: req.user._id, note: req.params.id });
  if (!deleted) throw new ApiError(404, 'Bookmark not found');

  res.status(200).json({
    success: true,
    message: 'Bookmark removed',
  });
});
