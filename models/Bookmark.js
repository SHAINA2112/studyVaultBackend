import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A student cannot bookmark the same note twice.
bookmarkSchema.index({ user: 1, note: 1 }, { unique: true });

export default mongoose.model('Bookmark', bookmarkSchema);
