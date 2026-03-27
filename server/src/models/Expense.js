import mongoose, { Schema } from 'mongoose';
const { model, models } = mongoose;
const settlementSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    owesToUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });
const expenseSchema = new Schema({
    tripId: {
        type: Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true,
    },
    paidBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    splitAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    memberCount: {
        type: Number,
        required: true,
        min: 1,
    },
    memberUserIds: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        default: [],
    },
    settlements: {
        type: [settlementSchema],
        default: [],
    },
}, {
    timestamps: true,
});
expenseSchema.index({ tripId: 1, createdAt: -1 });
export const Expense = models.Expense || model('Expense', expenseSchema);
