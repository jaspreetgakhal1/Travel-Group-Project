import mongoose, { Schema } from 'mongoose';

const { model, models } = mongoose;

const transactionSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ['released'],
      default: 'released',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ senderId: 1, receiverId: 1, tripId: 1, status: 1 });

export const Transaction = models.Transaction || model('Transaction', transactionSchema);
