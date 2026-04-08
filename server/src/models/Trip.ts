import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { getDefaultTripRecordStatus, TRIP_RECORD_STATUS_VALUES } from '../utils/tripRecordStatus.js';

const { model, models } = mongoose;
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
] as const;
const CURRENCY_VALUES = ['USD', 'CAD', 'EUR', 'GBP', 'INR', 'AUD', 'JPY'] as const;

export interface ITripSuggestion {
  _id: Types.ObjectId;
  name: string;
  whyVisit: string;
  estimatedCostPerPerson: number;
  vibeMatchPercent: number;
  imageUrl: string;
  voteUserIds: Types.ObjectId[];
  createdAt: Date;
}

export interface ITripSuggestionPreferences {
  collectiveMood: string;
  interest: string;
  budget: string;
  food: string;
  crowds: string;
}

export interface ITripEmergencyContact {
  name: string;
  phone: string;
}

export interface ITrip {
  organizerId: Types.ObjectId;
  title: string;
  description?: string;
  location: string;
  imageUrl?: string;
  price?: number;
  expectedBudget: number;
  travelerType?: string;
  currency: (typeof CURRENCY_VALUES)[number];
  isPrivate: boolean;
  emergencyContact: ITripEmergencyContact;
  category?: 'Adventure' | 'Luxury' | 'Budget' | 'Nature';
  startDate: Date;
  endDate: Date;
  status: (typeof TRIP_RECORD_STATUS_VALUES)[number];
  maxParticipants: number;
  participants: Types.ObjectId[];
  suggestions: ITripSuggestion[];
  suggestionPreferences?: ITripSuggestionPreferences | null;
  suggestionsGeneratedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripVirtuals {
  currentParticipantCount?: number;
}

export type TripDocument = HydratedDocument<ITrip, ITripVirtuals>;

type TripModelType = Model<ITrip, {}, {}, ITripVirtuals>;

const calculateExpectedBudgetDefault = (
  startDate: Date | string | undefined,
  endDate: Date | string | undefined,
  participantCount: number,
): number => {
  const normalizedStartDate = startDate instanceof Date ? startDate : new Date(startDate ?? Date.now());
  const normalizedEndDate = endDate instanceof Date ? endDate : new Date(endDate ?? normalizedStartDate);
  const durationMs = Math.max(normalizedEndDate.getTime() - normalizedStartDate.getTime(), 0);
  const durationDays = Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)) + 1);
  const safeParticipantCount = Number.isInteger(participantCount) && participantCount > 0 ? participantCount : 1;

  return durationDays * safeParticipantCount * 100;
};

export const getTripExpectedBudgetDefault = (tripValue?: Partial<ITrip> | null): number =>
  calculateExpectedBudgetDefault(tripValue?.startDate, tripValue?.endDate, tripValue?.maxParticipants ?? 1);

const tripSuggestionSchema = new Schema<ITripSuggestion>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    whyVisit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    estimatedCostPerPerson: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    vibeMatchPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    voteUserIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    id: true,
  },
);

const tripSchema = new Schema<ITrip, TripModelType, {}, {}, ITripVirtuals>(
  {
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      minlength: 12,
      maxlength: 1200,
      default: '',
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    expectedBudget: {
      type: Number,
      required: true,
      min: 1,
      default(this: ITrip | null | undefined) {
        return getTripExpectedBudgetDefault(this as Partial<ITrip> | null | undefined);
      },
    },
    travelerType: {
      type: String,
      trim: true,
      enum: TRAVELER_TYPE_VALUES,
      maxlength: 120,
      default: '',
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
      type: {
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
      required: true,
      default: {
        name: 'Primary Emergency Contact',
        phone: 'Not provided',
      },
    },
    category: {
      type: String,
      enum: ['Adventure', 'Luxury', 'Budget', 'Nature'],
      default: 'Budget',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: TRIP_RECORD_STATUS_VALUES,
      required: true,
      default(this: ITrip | null | undefined) {
        return getDefaultTripRecordStatus(this as Partial<ITrip> | null | undefined);
      },
      index: true,
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: 'maxParticipants must be an integer.',
      },
    },
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    suggestions: {
      type: [tripSuggestionSchema],
      default: [],
    },
    suggestionPreferences: {
      type: {
        collectiveMood: {
          type: String,
          trim: true,
          maxlength: 80,
          default: '',
        },
        interest: {
          type: String,
          trim: true,
          maxlength: 80,
          default: '',
        },
        budget: {
          type: String,
          trim: true,
          maxlength: 80,
          default: '',
        },
        food: {
          type: String,
          trim: true,
          maxlength: 80,
          default: '',
        },
        crowds: {
          type: String,
          trim: true,
          maxlength: 80,
          default: '',
        },
      },
      default: null,
    },
    suggestionsGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

tripSchema.index({ organizerId: 1, startDate: 1 });
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.index({ participants: 1 });
tripSchema.index({ status: 1, startDate: 1, endDate: 1 });

tripSchema.virtual('currentParticipantCount', {
  ref: 'Participant',
  localField: '_id',
  foreignField: 'tripId',
  count: true,
});

export const Trip =
  (models.Trip as TripModelType | undefined) || model<ITrip, TripModelType>('Trip', tripSchema);
