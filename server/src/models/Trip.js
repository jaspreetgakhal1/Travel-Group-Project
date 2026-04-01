import mongoose, { Schema } from 'mongoose';
import { ACTIVE_TRIP_STATUS, TRIP_STATUS_VALUES } from '../utils/tripStatus.js';
const { model, models } = mongoose;
const calculateExpectedBudgetDefault = (startDate, endDate, participantCount) => {
    const normalizedStartDate = startDate instanceof Date ? startDate : new Date(startDate ?? Date.now());
    const normalizedEndDate = endDate instanceof Date ? endDate : new Date(endDate ?? normalizedStartDate);
    const durationMs = Math.max(normalizedEndDate.getTime() - normalizedStartDate.getTime(), 0);
    const durationDays = Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)) + 1);
    const safeParticipantCount = Number.isInteger(participantCount) && participantCount > 0 ? participantCount : 1;
    return durationDays * safeParticipantCount * 100;
};
export const getTripExpectedBudgetDefault = (tripValue) => calculateExpectedBudgetDefault(tripValue?.startDate, tripValue?.endDate, tripValue?.maxParticipants ?? 1);
const tripSchema = new Schema({
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
        default() {
            return getTripExpectedBudgetDefault(this);
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
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
});
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
export const Trip = models.Trip || model('Trip', tripSchema);
