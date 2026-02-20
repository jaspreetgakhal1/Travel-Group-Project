import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ['Email'],
      default: 'Email',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocumentName: {
      type: String,
      default: null,
    },
    verificationDocumentMimeType: {
      type: String,
      default: null,
    },
    verificationDocumentSize: {
      type: Number,
      default: null,
    },
    verificationUploadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model('User', userSchema);
