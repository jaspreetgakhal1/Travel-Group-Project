import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owesToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    settlements: {
      type: [settlementSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ tripId: 1, createdAt: -1 });

export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
