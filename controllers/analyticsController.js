import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Note from '../models/Note.js';
import Download from '../models/Download.js';
import View from '../models/View.js';
import Bookmark from '../models/Bookmark.js';
import ContactMessage from '../models/ContactMessage.js';

/**
 * @route   GET /api/admin/analytics/overview
 * @access  Private/Admin
 */
export const getOverview = asyncHandler(async (req, res) => {
  const [totalStudents, totalNotes, totalBookmarks, totalMessages, unreadMessages, viewsAndDownloads] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Note.countDocuments({}),
    Bookmark.countDocuments({}),
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: 'unread' }),
    Note.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalDownloads: { $sum: '$downloads' } } },
    ]),
  ]);

  const { totalViews = 0, totalDownloads = 0 } = viewsAndDownloads[0] || {};

  res.status(200).json({
    success: true,
    message: 'Analytics overview fetched',
    data: {
      totalStudents,
      totalNotes,
      totalDownloads,
      totalViews,
      totalBookmarks,
      totalMessages,
      unreadMessages,
    },
  });
});

/**
 * @route   GET /api/admin/analytics/users
 * @access  Private/Admin
 * Registrations over time (daily buckets), default last 30 days.
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const registrations = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', count: 1 } },
  ]);

  const totalUsers = await User.countDocuments({});
  const activeUsers = await User.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    message: 'User analytics fetched',
    data: { registrations, totalUsers, activeUsers },
  });
});

/**
 * @route   GET /api/admin/analytics/downloads
 * @access  Private/Admin
 * Downloads over time (daily buckets), default last 30 days.
 */
export const getDownloadAnalytics = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const downloadsOverTime = await Download.aggregate([
    { $match: { downloadedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$downloadedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', count: 1 } },
  ]);

  const totalDownloads = await Download.countDocuments({});

  res.status(200).json({
    success: true,
    message: 'Download analytics fetched',
    data: { downloadsOverTime, totalDownloads },
  });
});

/**
 * @route   GET /api/admin/analytics/notes
 * @access  Private/Admin
 */
export const getNoteAnalytics = asyncHandler(async (req, res) => {
  const [mostDownloaded, mostViewed, popularSubjects, notesOverTime] = await Promise.all([
    Note.find({}).sort({ downloads: -1 }).limit(10).select('title subject downloads views'),
    Note.find({}).sort({ views: -1 }).limit(10).select('title subject downloads views'),
    Note.aggregate([
      { $group: { _id: '$subject', noteCount: { $sum: 1 }, totalViews: { $sum: '$views' }, totalDownloads: { $sum: '$downloads' } } },
      { $sort: { totalViews: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, subject: '$_id', noteCount: 1, totalViews: 1, totalDownloads: 1 } },
    ]),
    Note.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 90 },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    message: 'Note analytics fetched',
    data: { mostDownloaded, mostViewed, popularSubjects, notesOverTime },
  });
});

/**
 * @route   GET /api/admin/analytics/messages
 * @access  Private/Admin
 */
export const getMessageAnalytics = asyncHandler(async (req, res) => {
  const [byStatus, repliedCount, totalCount] = await Promise.all([
    ContactMessage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]),
    ContactMessage.countDocuments({ replied: true }),
    ContactMessage.countDocuments({}),
  ]);

  res.status(200).json({
    success: true,
    message: 'Message analytics fetched',
    data: {
      byStatus,
      repliedCount,
      totalCount,
      replyRate: totalCount ? Number(((repliedCount / totalCount) * 100).toFixed(1)) : 0,
    },
  });
});
