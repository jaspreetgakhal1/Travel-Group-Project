import mongoose, { Schema } from 'mongoose';
const { model, models } = mongoose;
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
tripSchema.virtual('currentParticipantCount', {
    ref: 'Participant',
    localField: '_id',
    foreignField: 'tripId',
    count: true,
});
export const Trip = models.Trip || model('Trip', tripSchema);
