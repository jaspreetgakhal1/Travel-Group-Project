import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { buildWalletSummary, fromCents, toCents } from '../utils/wallet.js';

const router = express.Router();

router.get('/summary', requireAuth, async (req, res) => {
  const authRequest = req;
  const userId = authRequest.user?.id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  try {
    const summary = await buildWalletSummary(userId);
    if ('error' in summary) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('GET /api/wallet/summary failed', error);
    return res.status(500).json({ message: 'Unable to load wallet summary right now.' });
  }
});

router.post('/release', requireAuth, async (req, res) => {
  const authRequest = req;
  const userId = authRequest.user?.id;
  const { tripId, recipientUserId, amount } = req.body ?? {};

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  if (typeof tripId !== 'string' || !mongoose.isValidObjectId(tripId)) {
    return res.status(400).json({ message: 'Trip id is invalid.' });
  }

  if (typeof recipientUserId !== 'string' || !mongoose.isValidObjectId(recipientUserId)) {
    return res.status(400).json({ message: 'Recipient user id is invalid.' });
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Release amount must be greater than 0.' });
  }

  const summary = await buildWalletSummary(userId);
  if ('error' in summary) {
    return res.status(summary.error.status).json({ message: summary.error.message });
  }

  const matchingDebt = summary.paidEntries.find(
    (entry) => entry.tripId === tripId && entry.recipientUserId === recipientUserId,
  );
  if (!matchingDebt) {
    return res.status(404).json({ message: 'Outstanding debt not found for this trip.' });
  }

  const releaseAmountCents = toCents(amount);
  const outstandingAmountCents = toCents(matchingDebt.amount);
  if (releaseAmountCents <= 0 || releaseAmountCents > outstandingAmountCents) {
    return res.status(400).json({ message: 'Release amount exceeds the outstanding debt.' });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const sender = await User.findOneAndUpdate(
      {
        _id: userId,
        escrowBalance: { $gte: fromCents(releaseAmountCents) },
      },
      {
        $inc: { escrowBalance: -fromCents(releaseAmountCents) },
      },
      {
        new: true,
        session,
      },
    );

    if (!sender) {
      throw Object.assign(new Error('Insufficient Escrow Balance.'), { statusCode: 400 });
    }

    const receiver = await User.findByIdAndUpdate(
      recipientUserId,
      {
        $inc: { escrowBalance: fromCents(releaseAmountCents) },
      },
      {
        new: true,
        session,
      },
    );

    if (!receiver) {
      throw Object.assign(new Error('Recipient user account not found.'), { statusCode: 404 });
    }

    await Transaction.create(
      [
        {
          senderId: userId,
          receiverId: recipientUserId,
          tripId,
          amount: fromCents(releaseAmountCents),
          status: 'released',
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const nextSummary = await buildWalletSummary(userId);
    if ('error' in nextSummary) {
      return res.status(nextSummary.error.status).json({ message: nextSummary.error.message });
    }

    return res.status(200).json(nextSummary);
  } catch (error) {
    await session.abortTransaction();
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Unable to release this payment right now.';
    console.error('POST /api/wallet/release failed', error);
    return res.status(statusCode).json({ message });
  } finally {
    await session.endSession();
  }
});

export default router;
