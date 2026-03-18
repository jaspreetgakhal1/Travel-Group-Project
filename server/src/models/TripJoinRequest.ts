import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

const { model, models } = mongoose;

export const TRIP_JOIN_REQUEST_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type TripJoinRequestStatus = (typeof TRIP_JOIN_REQUEST_STATUSES)[number];

export interface ITripJoinRequest {
  tripId: Types.ObjectId;
  requesterId: Types.ObjectId;
  hostId: Types.ObjectId;
  status: TripJoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TripJoinRequestDocument = HydratedDocument<ITripJoinRequest>;

type TripJoinRequestModelType = Model<ITripJoinRequest>;

const tripJoinRequestSchema = new Schema<ITripJoinRequest, TripJoinRequestModelType>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: TRIP_JOIN_REQUEST_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

tripJoinRequestSchema.index({ tripId: 1, requesterId: 1 }, { unique: true });
tripJoinRequestSchema.index({ hostId: 1, status: 1, createdAt: -1 });

export const TripJoinRequest =
  (models.TripJoinRequest as TripJoinRequestModelType | undefined) ||
  model<ITripJoinRequest, TripJoinRequestModelType>('TripJoinRequest', tripJoinRequestSchema);

