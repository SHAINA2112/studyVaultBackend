import mongoose from 'mongoose';

const viewSchema = new mongoose.Schema(
  {
    user: {
      // optional — a view can come from a logged-out visitor
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
    },
    ipHash: {
      // used to de-duplicate anonymous views without storing raw IPs
      type: String,
      default: null,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

viewSchema.index({ note: 1, viewedAt: -1 });
viewSchema.index({ user: 1, note: 1, viewedAt: -1 });
viewSchema.index({ ipHash: 1, note: 1, viewedAt: -1 });

export default mongoose.model('View', viewSchema);
