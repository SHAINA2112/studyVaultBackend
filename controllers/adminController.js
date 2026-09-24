import asyncHandler from 'express-async-handler';
import Note from '../models/Note.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import { ApiError } from '../middleware/errorMiddleware.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/storageService.js';
import { sendEmail, contactReplyTemplate } from '../services/emailService.js';

/* ------------------------------------------------------------------ */
/*  NOTES — create / update / delete / publish (admin only)            */
/* ------------------------------------------------------------------ */

/**
 * @route   POST /api/admin/notes
 * @access  Private/Admin
 * The ONLY endpoint in the whole API that can create a note.
 */
export const createNote = asyncHandler(async (req, res) => {
  const { title, description, subject, semester, category, tags } = req.body;

  const documentFile = req.files?.document?.[0];
  if (!documentFile) throw new ApiError(400, 'A document file (PDF/DOC/DOCX) is required');

  const docUpload = await uploadBufferToCloudinary(documentFile.buffer, {
    folder: 'shaina-studyvault/documents',
    resourceType: 'auto',
    filename: documentFile.originalname,
  });

  let thumbnail = { url: '', publicId: '' };
  const thumbnailFile = req.files?.thumbnail?.[0];
  if (thumbnailFile) {
    const thumbUpload = await uploadBufferToCloudinary(thumbnailFile.buffer, {
      folder: 'shaina-studyvault/thumbnails',
      resourceType: 'image',
      filename: thumbnailFile.originalname,
    });
    thumbnail = { url: thumbUpload.secure_url, publicId: thumbUpload.public_id };
  }

  const note = await Note.create({
    title,
    description,
    subject,
    semester,
    category,
    tags: tags ? String(tags).split(',') : [],
    thumbnail,
    fileUrl: docUpload.secure_url,
    filePublicId: docUpload.public_id,
    fileType: documentFile.mimetype.includes('pdf') ? 'PDF' : 'DOC',
    fileSize: documentFile.size,
    pages: Number(req.body.pages) || 0,
    uploadedBy: req.user._id,
    isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
  });

  res.status(201).json({
    success: true,
    message: 'Note created successfully',
    data: { note },
  });
});

/**
 * @route   PUT /api/admin/notes/:id
 * @access  Private/Admin
 */
export const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw new ApiError(404, 'Note not found');

  const editableFields = ['title', 'description', 'subject', 'semester', 'category', 'pages'];
  for (const field of editableFields) {
    if (req.body[field] !== undefined) note[field] = req.body[field];
  }
  if (req.body.tags !== undefined) {
    note.tags = String(req.body.tags).split(',');
  }

  const documentFile = req.files?.document?.[0];
  if (documentFile) {
    const docUpload = await uploadBufferToCloudinary(documentFile.buffer, {
      folder: 'shaina-studyvault/documents',
      resourceType: 'auto',
      filename: documentFile.originalname,
    });
    await deleteFromCloudinary(note.filePublicId, 'raw');
    note.fileUrl = docUpload.secure_url;
    note.filePublicId = docUpload.public_id;
    note.fileType = documentFile.mimetype.includes('pdf') ? 'PDF' : 'DOC';
    note.fileSize = documentFile.size;
  }

  const thumbnailFile = req.files?.thumbnail?.[0];
  if (thumbnailFile) {
    const thumbUpload = await uploadBufferToCloudinary(thumbnailFile.buffer, {
      folder: 'shaina-studyvault/thumbnails',
      resourceType: 'image',
      filename: thumbnailFile.originalname,
    });
    if (note.thumbnail?.publicId) await deleteFromCloudinary(note.thumbnail.publicId, 'image');
    note.thumbnail = { url: thumbUpload.secure_url, publicId: thumbUpload.public_id };
  }

  await note.save();

  res.status(200).json({
    success: true,
    message: 'Note updated successfully',
    data: { note },
  });
});

/**
 * @route   DELETE /api/admin/notes/:id
 * @access  Private/Admin
 */
export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw new ApiError(404, 'Note not found');

  await Promise.all([
    deleteFromCloudinary(note.filePublicId, 'raw'),
    note.thumbnail?.publicId ? deleteFromCloudinary(note.thumbnail.publicId, 'image') : Promise.resolve(),
  ]);

  await note.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Note deleted successfully',
  });
});

/**
 * @route   PATCH /api/admin/notes/:id/publish
 * @access  Private/Admin
 * Body: { isPublished: true|false }
 */
export const setNotePublishState = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw new ApiError(404, 'Note not found');

  note.isPublished = Boolean(req.body.isPublished);
  await note.save();

  res.status(200).json({
    success: true,
    message: note.isPublished ? 'Note published' : 'Note unpublished',
    data: { note },
  });
});

/**
 * @route   GET /api/admin/notes
 * @access  Private/Admin
 * Admin listing includes unpublished notes too, unlike the public /api/notes.
 */
export const getAdminNotes = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.search) filter.$text = { $search: req.query.search };
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';

  const [notes, total] = await Promise.all([
    Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('uploadedBy', 'name username'),
    Note.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Notes fetched',
    data: { notes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/* ------------------------------------------------------------------ */
/*  USERS — search / view / activate / deactivate (admin only)         */
/* ------------------------------------------------------------------ */

/**
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { search, role, isActive, sort = '-createdAt' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
  }

  const sortStage = {};
  const sortField = String(sort).replace(/^-/, '');
  sortStage[sortField] = String(sort).startsWith('-') ? -1 : 1;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sortStage).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Users fetched',
    data: { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  res.status(200).json({
    success: true,
    message: 'User fetched',
    data: { user },
  });
});

/**
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 * Body: { isActive: true|false }. This is the ONLY way an account's active
 * status changes — students can never touch this on themselves.
 */
export const setUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own account status');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.role === 'admin') {
    throw new ApiError(400, 'Admin accounts cannot be deactivated through this endpoint');
  }

  user.isActive = Boolean(req.body.isActive);
  await user.save();

  res.status(200).json({
    success: true,
    message: user.isActive ? 'User activated' : 'User deactivated',
    data: { user },
  });
});

/* ------------------------------------------------------------------ */
/*  MESSAGES — inbox management (admin only)                           */
/* ------------------------------------------------------------------ */

/**
 * @route   GET /api/admin/messages
 * @access  Private/Admin
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { search, status, sort = '-createdAt' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  const sortStage = {};
  const sortField = String(sort).replace(/^-/, '');
  sortStage[sortField] = String(sort).startsWith('-') ? -1 : 1;

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter).sort(sortStage).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Messages fetched',
    data: { messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * @route   GET /api/admin/messages/stats
 * @access  Private/Admin
 */
export const getMessageStats = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, unread, read, today] = await Promise.all([
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: 'unread' }),
    ContactMessage.countDocuments({ status: 'read' }),
    ContactMessage.countDocuments({ createdAt: { $gte: startOfDay } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Message stats fetched',
    data: { total, unread, read, today },
  });
});

/**
 * @route   GET /api/admin/messages/:id
 * @access  Private/Admin
 * Opening a message marks it as read.
 */
export const getMessageById = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findById(req.params.id);
  if (!msg) throw new ApiError(404, 'Message not found');

  if (msg.status === 'unread') {
    msg.status = 'read';
    await msg.save();
  }

  res.status(200).json({
    success: true,
    message: 'Message fetched',
    data: { message: msg },
  });
});

/**
 * @route   PATCH /api/admin/messages/:id/read
 * @access  Private/Admin
 */
export const markMessageRead = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true });
  if (!msg) throw new ApiError(404, 'Message not found');

  res.status(200).json({ success: true, message: 'Message marked as read', data: { message: msg } });
});

/**
 * @route   PATCH /api/admin/messages/:id/unread
 * @access  Private/Admin
 */
export const markMessageUnread = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { status: 'unread' }, { new: true });
  if (!msg) throw new ApiError(404, 'Message not found');

  res.status(200).json({ success: true, message: 'Message marked as unread', data: { message: msg } });
});

/**
 * @route   DELETE /api/admin/messages/:id
 * @access  Private/Admin
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!msg) throw new ApiError(404, 'Message not found');

  res.status(200).json({ success: true, message: 'Message deleted successfully' });
});

/**
 * @route   POST /api/admin/messages/:id/reply
 * @access  Private/Admin
 * The recipient is ALWAYS the email stored on the original message —
 * the request body can never override who the reply is sent to.
 */
export const replyToMessage = asyncHandler(async (req, res) => {
  const { message: replyText } = req.body;

  const msg = await ContactMessage.findById(req.params.id);
  if (!msg) throw new ApiError(404, 'Message not found');

  await sendEmail({
    to: msg.email, // always the original sender — never client-supplied
    subject: `Re: ${msg.subject}`,
    html: contactReplyTemplate({ name: msg.name, originalMessage: msg.message, reply: replyText }),
    text: replyText,
  });

  msg.reply = replyText;
  msg.replied = true;
  msg.repliedAt = new Date();
  msg.repliedBy = req.user._id;
  msg.status = 'read';
  await msg.save();

  res.status(200).json({
    success: true,
    message: 'Reply sent successfully',
    data: { message: msg },
  });
});
