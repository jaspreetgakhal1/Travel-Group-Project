import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { ACTIVE_TRIP_STATUS, TRIP_STATUS_VALUES } from '../utils/tripStatus.js';

const { model, models } = mongoose;

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

export interface ITrip {
  organizerId: Types.ObjectId;
  title: string;
  description?: string;
  location: string;
  imageUrl?: string;
  price?: number;
  expectedBudget: number;
  travelerType?: string;
  category?: 'Adventure' | 'Luxury' | 'Budget' | 'Nature';
  startDate: Date;
  endDate: Date;
  status: (typeof TRIP_STATUS_VALUES)[number];
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
      maxlength: 2048,
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
      min: 0,
      default(this: ITrip) {
        return calculateExpectedBudgetDefault(this.startDate, this.endDate, this.maxParticipants);
      },
    },
    travelerType: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
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
      enum: TRIP_STATUS_VALUES,
      required: true,
      default: ACTIVE_TRIP_STATUS,
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
