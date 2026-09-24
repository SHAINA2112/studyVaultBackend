import mongoose from 'mongoose';

const downloadSchema = new mongoose.Schema(
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
    downloadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

downloadSchema.index({ note: 1, downloadedAt: -1 });
downloadSchema.index({ user: 1, downloadedAt: -1 });

export default mongoose.model('Download', downloadSchema);
