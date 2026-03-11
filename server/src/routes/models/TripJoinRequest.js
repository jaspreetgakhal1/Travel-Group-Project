import { Schema, model, models } from 'mongoose';
export const TRIP_JOIN_REQUEST_STATUSES = ['pending', 'accepted', 'rejected'];
const tripJoinRequestSchema = new Schema({
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
}, {
    timestamps: true,
});
tripJoinRequestSchema.index({ tripId: 1, requesterId: 1 }, { unique: true });
tripJoinRequestSchema.index({ hostId: 1, status: 1, createdAt: -1 });
export const TripJoinRequest = models.TripJoinRequest ||
    model('TripJoinRequest', tripJoinRequestSchema);
