import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

const { model, models } = mongoose;

export interface ITrip {
  organizerId: Types.ObjectId;
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  participants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripVirtuals {
  currentParticipantCount?: number;
}

export type TripDocument = HydratedDocument<ITrip, ITripVirtuals>;

type TripModelType = Model<ITrip, {}, {}, ITripVirtuals>;

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
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
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

tripSchema.virtual('currentParticipantCount', {
  ref: 'Participant',
  localField: '_id',
  foreignField: 'tripId',
  count: true,
});

export const Trip =
  (models.Trip as TripModelType | undefined) || model<ITrip, TripModelType>('Trip', tripSchema);
