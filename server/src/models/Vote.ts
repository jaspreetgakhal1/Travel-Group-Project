import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

const { model, models } = mongoose;

export const VOTE_SESSION_STATUS_VALUES = ['open', 'decided', 'archived'] as const;
export const VOTE_SESSION_DECISION_MODE_VALUES = ['majority', 'host_closed'] as const;

export interface IVote {
  tripId: Types.ObjectId;
  sourceSuggestionId: string;
  placeName: string;
  description: string;
  estimatedCost: number;
  imageUrl: string;
  votes: Types.ObjectId[];
  status: (typeof VOTE_SESSION_STATUS_VALUES)[number];
  createdByUserId: Types.ObjectId;
  decidedByUserId?: Types.ObjectId | null;
  decisionMode?: (typeof VOTE_SESSION_DECISION_MODE_VALUES)[number] | null;
  decisionMadeAt?: Date | null;
  notificationSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VoteDocument = HydratedDocument<IVote>;
type VoteModelType = Model<IVote>;

const voteSchema = new Schema<IVote, VoteModelType>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    sourceSuggestionId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    placeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    votes: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: VOTE_SESSION_STATUS_VALUES,
      required: true,
      default: 'open',
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    decidedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decisionMode: {
      type: String,
      enum: VOTE_SESSION_DECISION_MODE_VALUES,
      default: null,
    },
    decisionMadeAt: {
      type: Date,
      default: null,
    },
    notificationSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

voteSchema.index({ tripId: 1, sourceSuggestionId: 1, status: 1 });
voteSchema.index({ tripId: 1, status: 1, decisionMadeAt: -1 });

export const Vote = (models.Vote as VoteModelType | undefined) || model<IVote, VoteModelType>('Vote', voteSchema);
