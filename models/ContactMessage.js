import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
    },
    replied: {
      type: Boolean,
      default: false,
    },
    reply: {
      type: String,
      default: '',
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ name: 'text', email: 'text', subject: 'text', message: 'text' });
contactMessageSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ContactMessage', contactMessageSchema);
