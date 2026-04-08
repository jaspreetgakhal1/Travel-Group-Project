import mongoose, { Schema } from 'mongoose';

const { model, models } = mongoose;

const deletedUserSchema = new Schema(
  {
    originalUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    deletedByUserId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    firstName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    mobileNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 24,
    },
    profileImageDataUrl: {
      type: String,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      default: null,
      maxlength: 240,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationDocumentName: {
      type: String,
      default: null,
    },
    verificationDocumentMimeType: {
      type: String,
      default: null,
    },
    verificationUploadedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      maxlength: 240,
    },
    createdAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  },
);

deletedUserSchema.index({ deletedAt: -1, verificationStatus: 1 });

export const DeletedUser = models.DeletedUser || model('DeletedUser', deletedUserSchema);
