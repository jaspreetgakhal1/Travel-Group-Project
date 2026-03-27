import mongoose, { Schema } from 'mongoose';
const { model, models } = mongoose;
export const PARTICIPANT_ROLES = ['host', 'participant'];
const participantSchema = new Schema({
    tripId: {
        type: Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: PARTICIPANT_ROLES,
        required: true,
        default: 'participant',
    },
}, {
    timestamps: true,
});
participantSchema.index({ tripId: 1, userId: 1 }, { unique: true });
participantSchema.index({ userId: 1, createdAt: -1 });
participantSchema.index({ tripId: 1, role: 1 });
export const Participant = models.Participant ||
    model('Participant', participantSchema);
