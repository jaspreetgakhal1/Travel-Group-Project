import mongoose, { Schema } from 'mongoose';

const { model, models } = mongoose;

const paymentSchema = new Schema(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    payerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

paymentSchema.index({ payerId: 1, recipientUserId: 1, tripId: 1, status: 1 });

export const Payment = models.Payment || model('Payment', paymentSchema);
