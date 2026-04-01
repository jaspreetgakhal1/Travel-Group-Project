// Added by Codex: project documentation comment for server\src\models\Post.js
import mongoose from 'mongoose';
import { ACTIVE_TRIP_STATUS, TRIP_STATUS_VALUES } from '../utils/tripStatus.js';

const TRAVELER_TYPE_VALUES = [
  'Budget Backpacker',
  'Luxury Seeker',
  'Adventure Junkie',
  'Digital Nomad',
  'Culture Vulture',
  'Social Butterfly',
  'Slow Traveler',
  'Foodie Explorer',
  'Photo Enthusiast',
  'Minimalist',
];
const CURRENCY_VALUES = ['USD', 'CAD', 'EUR', 'GBP', 'INR', 'AUD', 'JPY'];

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
      enum: TRIP_STATUS_VALUES,
      default: ACTIVE_TRIP_STATUS,
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
    expectedBudget: {
      type: Number,
      required: true,
      min: 1,
      default() {
        const durationDays = Number.isInteger(this.durationDays) && this.durationDays > 0 ? this.durationDays : 1;
        const participantCount = Number.isInteger(this.requiredPeople) && this.requiredPeople > 0 ? this.requiredPeople : 1;
        return durationDays * participantCount * 100;
      },
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
      enum: TRAVELER_TYPE_VALUES,
      maxlength: 120,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      enum: CURRENCY_VALUES,
      default: 'USD',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    emergencyContact: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 40,
      },
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

