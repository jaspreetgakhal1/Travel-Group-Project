import mongoose from 'mongoose';

export const TRIP_JOIN_REQUEST_STATUSES = ['pending', 'accepted', 'rejected'];

const tripJoinRequestSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
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
  mongoose.models.TripJoinRequest || mongoose.model('TripJoinRequest', tripJoinRequestSchema);
