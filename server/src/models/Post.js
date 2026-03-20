// Added by Codex: project documentation comment for server\src\models\Post.js
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ['Active', 'Completed'],
      default: 'Active',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    hostName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    onlyVerifiedUsers: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    requiredPeople: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    spotsFilledPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    expectations: {
      type: [String],
      default: [],
    },
    travelerType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Post = mongoose.model('Post', postSchema);

