import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Note from '../models/Note.js';
import View from '../models/View.js';
import Download from '../models/Download.js';
import { ApiError } from '../middleware/errorMiddleware.js';

const SORT_MAP = {
  popular: { views: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  downloads: { downloads: -1 },
  title: { title: 1 },
};

/**
 * @route   GET /api/notes
 * @access  Public
 * Supports search, subject/semester/category/tags filters, sorting and pagination.
 * Only published notes are ever returned here.
 */
export const getNotes = asyncHandler(async (req, res) => {
  const { search, subject, semester, category, tags, sort = 'popular' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 100);
  const skip = (page - 1) * limit;

  const filter = { isPublished: true };

  if (subject) filter.subject = subject;
  if (semester) filter.semester = semester;
  if (category) filter.category = category;
  if (tags) {
    const tagList = String(tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tagList.length) filter.tags = { $in: tagList };
  }

  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  const sortStage = SORT_MAP[sort] || SORT_MAP.popular;
  // When doing a text search, prioritize relevance score before the requested sort.
  const projection = search && search.trim() ? { score: { $meta: 'textScore' } } : undefined;
  const sortFinal = search && search.trim() ? { score: { $meta: 'textScore' }, ...sortStage } : sortStage;

  const [notes, total] = await Promise.all([
    Note.find(filter, projection)
      .populate('uploadedBy', 'name username')
      .sort(sortFinal)
      .skip(skip)
      .limit(limit),
    Note.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Notes fetched',
    data: {
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

async function recordViewIfFresh(note, req) {
  // Avoid inflating view counts on rapid repeat requests: one view per
  // user (or IP, if anonymous) per note per 6-hour window.
  const WINDOW_MS = 6 * 60 * 60 * 1000;
  const since = new Date(Date.now() - WINDOW_MS);

  const dedupeFilter = req.user
    ? { note: note._id, user: req.user._id, viewedAt: { $gte: since } }
    : { note: note._id, ipHash: hashIp(req.ip), viewedAt: { $gte: since } };

  const recent = await View.findOne(dedupeFilter);
  if (recent) return false;

  await View.create({
    note: note._id,
    user: req.user ? req.user._id : null,
    ipHash: req.user ? null : hashIp(req.ip),
  });
  note.views += 1;
  await note.save();
  return true;
}

/**
 * @route   GET /api/notes/:id
 * @access  Public (optionalAuth to attribute views to a user when logged in)
 */
export const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, isPublished: true }).populate('uploadedBy', 'name username');
  if (!note) throw new ApiError(404, 'Note not found');

  await recordViewIfFresh(note, req);

  res.status(200).json({
    success: true,
    message: 'Note fetched',
    data: { note },
  });
});

/**
 * @route   GET /api/notes/:id/read
 * @access  Public (optionalAuth)
 * Returns the secure document URL for the in-browser reader.
 */
export const readNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) throw new ApiError(404, 'Note not found');

  await recordViewIfFresh(note, req);

  res.status(200).json({
    success: true,
    message: 'Note ready to read',
    data: {
      fileUrl: note.fileUrl,
      fileType: note.fileType,
      pages: note.pages,
      title: note.title,
    },
  });
});

/**
 * @route   GET /api/notes/:id/download
 * @access  Private (any authenticated student or admin)
 */
export const downloadNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) throw new ApiError(404, 'Note not found');

  await Download.create({ user: req.user._id, note: note._id });
  note.downloads += 1;
  await note.save();

  res.status(200).json({
    success: true,
    message: 'Download recorded',
    data: {
      fileUrl: note.fileUrl,
      fileType: note.fileType,
      title: note.title,
    },
  });
});

/**
 * @route   GET /api/notes/meta/filters
 * @access  Public
 * Convenience endpoint returning the distinct subjects/semesters/categories
 * currently in use, so the frontend filter dropdowns stay in sync with real data.
 */
export const getNoteFilters = asyncHandler(async (req, res) => {
  const [subjects, semesters, categories] = await Promise.all([
    Note.distinct('subject', { isPublished: true }),
    Note.distinct('semester', { isPublished: true }),
    Note.distinct('category', { isPublished: true }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Filter options fetched',
    data: { subjects, semesters, categories },
  });
});
