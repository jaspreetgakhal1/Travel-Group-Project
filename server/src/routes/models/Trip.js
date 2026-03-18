import { Schema, model, models } from 'mongoose';
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
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
});
tripSchema.index({ organizerId: 1, startDate: 1 });
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.virtual('currentParticipantCount', {
    ref: 'Participant',
    localField: '_id',
    foreignField: 'tripId',
    count: true,
});
export const Trip = models.Trip || model('Trip', tripSchema);
