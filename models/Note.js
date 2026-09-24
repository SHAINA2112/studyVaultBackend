import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    semester: {
      type: String,
      required: [true, 'Semester is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: ['Lecture Notes', 'Past Papers', 'Lab Manual', 'Cheat Sheet', 'Assignment', 'Book Summary'],
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => (Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : []),
    },
    thumbnail: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    filePublicId: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      default: 'PDF',
    },
    fileSize: {
      // stored in bytes
      type: Number,
      default: 0,
    },
    pages: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

noteSchema.index({ title: 'text', description: 'text', tags: 'text', subject: 'text', category: 'text' });
noteSchema.index({ subject: 1, semester: 1, category: 1 });
noteSchema.index({ isPublished: 1, createdAt: -1 });

export default mongoose.model('Note', noteSchema);
