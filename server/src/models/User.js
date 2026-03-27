// Added by Codex: project documentation comment for server\src\models\User.js
import mongoose from 'mongoose';

const TRAVEL_ROLES = ['The Navigator', 'The Foodie', 'The Photographer', 'The Budgeter'];

const travelDNASchema = new mongoose.Schema(
  {
    socialBattery: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    planningStyle: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    budgetFlexibility: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    morningSync: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    riskAppetite: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    travelRoles: {
      type: [
        {
          type: String,
          enum: TRAVEL_ROLES,
        },
      ],
      default: [],
    },
  },
  {
    _id: false,
  },
);

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
    countryCode: {
      type: String,
      default: '+1',
      trim: true,
      maxlength: 8,
    },
    mobileNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 24,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    profileImageDataUrl: {
      type: String,
      default: null,
    },
    escrowBalance: {
      type: Number,
      default: 500,
      min: 0,
    },
    travelDNA: {
      type: travelDNASchema,
      default: () => ({
        socialBattery: 5,
        planningStyle: 5,
        budgetFlexibility: 5,
        morningSync: 5,
        riskAppetite: 5,
        cleanliness: 5,
        travelRoles: [],
      }),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified'],
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

