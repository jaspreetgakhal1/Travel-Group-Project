import mongoose, { Schema } from 'mongoose';
const { model, models } = mongoose;
export const NOTIFICATION_TYPE_VALUES = [
    'verification_verified',
    'verification_rejected',
    'trip_vote_decided',
];
const notificationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: NOTIFICATION_TYPE_VALUES,
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 280,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    metadata: {
        type: {
            rejectionReason: {
                type: String,
                default: null,
                maxlength: 240,
            },
            tripId: {
                type: String,
                default: null,
                maxlength: 64,
            },
            voteId: {
                type: String,
                default: null,
                maxlength: 64,
            },
            placeName: {
                type: String,
                default: null,
                maxlength: 160,
            },
        },
        default: null,
    },
}, {
    timestamps: true,
});
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
export const Notification = models.Notification ||
    model('Notification', notificationSchema);
