import mongoose, { Schema } from 'mongoose';
const { model, models } = mongoose;
export const VOTE_SESSION_STATUS_VALUES = ['open', 'decided', 'archived'];
export const VOTE_SESSION_DECISION_MODE_VALUES = ['majority', 'host_closed'];
const voteSchema = new Schema({
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
}, {
    timestamps: true,
});
voteSchema.index({ tripId: 1, sourceSuggestionId: 1, status: 1 });
voteSchema.index({ tripId: 1, status: 1, decisionMadeAt: -1 });
export const Vote = models.Vote || model('Vote', voteSchema);
