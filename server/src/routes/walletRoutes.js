import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { buildWalletSummary, fromCents, toCents } from '../utils/wallet.js';

const router = express.Router();

const createUpdateOptions = (session) => (session ? { new: true, session } : { new: true });

const buildReleaseTransactionPayload = ({ userId, recipientUserId, tripId, releaseAmountCents }) => ({
  senderId: userId,
  receiverId: recipientUserId,
  tripId,
  amount: fromCents(releaseAmountCents),
  status: 'released',
});

const createReleaseError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const isTransactionUnsupportedError = (error) => {
  const message = error instanceof Error ? error.message : '';
  return (
    error?.code === 20 &&
    /transaction numbers are only allowed on a replica set member or mongos/i.test(message)
  );
};

const applyWalletRelease = async ({ userId, recipientUserId, tripId, releaseAmountCents, session = null }) => {
  const sender = await User.findOneAndUpdate(
    {
      _id: userId,
      escrowBalance: { $gte: fromCents(releaseAmountCents) },
    },
    {
      $inc: { escrowBalance: -fromCents(releaseAmountCents) },
    },
    createUpdateOptions(session),
  );

  if (!sender) {
    throw createReleaseError('Insufficient Escrow Balance.', 400);
  }

  const receiver = await User.findByIdAndUpdate(
    recipientUserId,
    {
      $inc: { escrowBalance: fromCents(releaseAmountCents) },
    },
    createUpdateOptions(session),
  );

  if (!receiver) {
    if (!session) {
      await User.findByIdAndUpdate(userId, {
        $inc: { escrowBalance: fromCents(releaseAmountCents) },
      });
    }

    throw createReleaseError('Recipient user account not found.', 404);
  }

  const transactionPayload = buildReleaseTransactionPayload({
    userId,
    recipientUserId,
    tripId,
    releaseAmountCents,
  });

  try {
    if (session) {
      await Transaction.create([transactionPayload], { session });
      return;
    }

    await Transaction.create(transactionPayload);
  } catch (error) {
    if (!session) {
      const rollbackResults = await Promise.allSettled([
        User.findByIdAndUpdate(userId, {
          $inc: { escrowBalance: fromCents(releaseAmountCents) },
        }),
        User.findByIdAndUpdate(recipientUserId, {
          $inc: { escrowBalance: -fromCents(releaseAmountCents) },
        }),
      ]);

      if (rollbackResults.some((result) => result.status === 'rejected')) {
        console.error('Wallet release rollback failed after transaction record creation error.', rollbackResults);
      }
    }

    throw error;
  }
};

const applyWalletReleaseWithTransaction = async (payload) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    await applyWalletRelease({ ...payload, session });
    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

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

  try {
    try {
      await applyWalletReleaseWithTransaction({
        userId,
        recipientUserId,
        tripId,
        releaseAmountCents,
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }

      console.warn('MongoDB transactions are unavailable. Retrying wallet release without a session.');
      await applyWalletRelease({
        userId,
        recipientUserId,
        tripId,
        releaseAmountCents,
      });
    }

    const nextSummary = await buildWalletSummary(userId);
    if ('error' in nextSummary) {
      return res.status(nextSummary.error.status).json({ message: nextSummary.error.message });
    }

    return res.status(200).json(nextSummary);
  } catch (error) {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Unable to release this payment right now.';
    console.error('POST /api/wallet/release failed', error);
    return res.status(statusCode).json({ message });
  }
});

export default router;
