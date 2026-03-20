import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Expense } from '../models/Expense.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import type { AuthenticatedUser } from '../types/auth.js';

const router = express.Router();

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const buildDisplayName = (user: {
  firstName?: string;
  lastName?: string;
  userId?: string;
  email?: string;
} | null | undefined): string => {
  const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.userId || user?.email || 'Traveler';
};

const getAvatar = (user: { profileImageDataUrl?: string | null } | null | undefined): string | null =>
  typeof user?.profileImageDataUrl === 'string' && user.profileImageDataUrl.trim() ? user.profileImageDataUrl.trim() : null;

const loadTripContext = async (tripId: string, requesterId: string | undefined) => {
  if (!mongoose.isValidObjectId(tripId) || !requesterId || !mongoose.isValidObjectId(requesterId)) {
    return { error: { status: 400, message: 'Trip id is invalid.' } } as const;
  }

  const trip = await Trip.findById(tripId)
    .select('_id organizerId title location imageUrl participants')
    .lean();

  if (!trip) {
    return { error: { status: 404, message: 'Trip not found.' } } as const;
  }

  const orderedMemberIds = Array.from(
    new Set([
      String(trip.organizerId),
      ...(Array.isArray(trip.participants) ? trip.participants.map((participantId) => String(participantId)) : []),
    ]),
  );

  if (!orderedMemberIds.includes(requesterId)) {
    return { error: { status: 403, message: 'Only trip members can split bills for this trip.' } } as const;
  }

  const users = await User.find({ _id: { $in: orderedMemberIds } })
    .select('_id firstName lastName userId email profileImageDataUrl')
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  return {
    trip,
    members: orderedMemberIds
      .map((userId) => {
        const user = usersById.get(userId);
        if (!user) {
          return null;
        }

        return {
          id: userId,
          name: buildDisplayName(user),
          avatar: getAvatar(user),
          isHost: userId === String(trip.organizerId),
        };
      })
      .filter((member): member is { id: string; name: string; avatar: string | null; isHost: boolean } => Boolean(member)),
  } as const;
};

const buildExpenseSummary = async (tripId: string, requesterId: string | undefined) => {
  const context = await loadTripContext(tripId, requesterId);
  if ('error' in context) {
    return context;
  }

  const { trip, members } = context;
  const membersById = new Map(members.map((member) => [member.id, member]));
  const expenses = await Expense.find({ tripId })
    .sort({ createdAt: -1 })
    .lean();

  const settlementByPair = new Map<
    string,
    { fromUserId: string; fromName: string; toUserId: string; toName: string; amount: number }
  >();
  const balancesByUserId = new Map(
    members.map((member) => [
      member.id,
      {
        userId: member.id,
        name: member.name,
        avatar: member.avatar,
        totalOwed: 0,
        totalReceivable: 0,
      },
    ]),
  );

  const serializedExpenses = expenses.map((expense) => {
    const payerId = String(expense.paidBy);
    const payer = membersById.get(payerId);
    const settlements = (Array.isArray(expense.settlements) ? expense.settlements : []).map((settlement) => {
      const debtorId = String(settlement.userId);
      const creditorId = String(settlement.owesToUserId);
      const debtor = membersById.get(debtorId);
      const creditor = membersById.get(creditorId);
      const amount = roundCurrency(Number(settlement.amount) || 0);
      const pairKey = `${debtorId}->${creditorId}`;
      settlementByPair.set(pairKey, {
        fromUserId: debtorId,
        fromName: debtor?.name ?? 'Traveler',
        toUserId: creditorId,
        toName: creditor?.name ?? 'Traveler',
        amount: roundCurrency((settlementByPair.get(pairKey)?.amount ?? 0) + amount),
      });

      const debtorBalance = balancesByUserId.get(debtorId);
      if (debtorBalance) {
        debtorBalance.totalOwed = roundCurrency(debtorBalance.totalOwed + amount);
      }

      const creditorBalance = balancesByUserId.get(creditorId);
      if (creditorBalance) {
        creditorBalance.totalReceivable = roundCurrency(creditorBalance.totalReceivable + amount);
      }

      return {
        userId: debtorId,
        name: debtor?.name ?? 'Traveler',
        avatar: debtor?.avatar ?? null,
        owesToUserId: creditorId,
        owesToName: creditor?.name ?? 'Traveler',
        amount,
      };
    });

    return {
      id: String(expense._id),
      description: expense.description,
      amount: roundCurrency(expense.amount),
      splitAmount: roundCurrency(expense.splitAmount),
      memberCount: expense.memberCount,
      paidBy: {
        userId: payerId,
        name: payer?.name ?? 'Traveler',
        avatar: payer?.avatar ?? null,
      },
      settlements,
      createdAt: expense.createdAt instanceof Date ? expense.createdAt.toISOString() : new Date(expense.createdAt).toISOString(),
    };
  });

  return {
    trip: {
      id: String(trip._id),
      title: trip.title,
      location: trip.location,
      imageUrl: typeof trip.imageUrl === 'string' ? trip.imageUrl : '',
    },
    members,
    expenses: serializedExpenses,
    totalExpenses: roundCurrency(serializedExpenses.reduce((total, expense) => total + expense.amount, 0)),
    settlementSummary: Array.from(settlementByPair.values()).sort((left, right) => right.amount - left.amount),
    balances: Array.from(balancesByUserId.values()).map((balance) => ({
      ...balance,
      netBalance: roundCurrency(balance.totalReceivable - balance.totalOwed),
    })),
  };
};

router.get('/trips/:tripId', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';

  try {
    const summary = await buildExpenseSummary(tripId, authRequest.user?.id);
    if ('error' in summary) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('GET /api/expenses/trips/:tripId failed', error);
    return res.status(500).json({ message: 'Unable to load trip expenses right now.' });
  }
});

router.post('/split', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const requesterId = authRequest.user?.id;
  const { tripId, description, amount } = req.body as {
    tripId?: unknown;
    description?: unknown;
    amount?: unknown;
  };

  if (typeof tripId !== 'string' || typeof description !== 'string' || typeof amount !== 'number') {
    return res.status(400).json({ message: 'Trip id, description, and amount are required.' });
  }

  const normalizedDescription = description.trim();
  if (normalizedDescription.length < 2) {
    return res.status(400).json({ message: 'Description must be at least 2 characters.' });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0.' });
  }

  try {
    const context = await loadTripContext(tripId, requesterId);
    if ('error' in context) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const memberIds = context.members.map((member) => member.id);
    const memberCount = memberIds.length;
    if (memberCount === 0 || !requesterId) {
      return res.status(400).json({ message: 'Trip has no members to split with.' });
    }

    const totalCents = Math.round(amount * 100);
    const baseShareCents = Math.floor(totalCents / memberCount);
    const splitAmount = roundCurrency(baseShareCents / 100);
    const settlements = memberIds
      .filter((memberId) => memberId !== requesterId)
      .map((memberId) => ({
        userId: new mongoose.Types.ObjectId(memberId),
        owesToUserId: new mongoose.Types.ObjectId(requesterId),
        amount: splitAmount,
      }));

    await Expense.create({
      tripId: new mongoose.Types.ObjectId(tripId),
      paidBy: new mongoose.Types.ObjectId(requesterId),
      description: normalizedDescription,
      amount: roundCurrency(amount),
      splitAmount,
      memberCount,
      memberUserIds: memberIds.map((memberId) => new mongoose.Types.ObjectId(memberId)),
      settlements,
    });

    const summary = await buildExpenseSummary(tripId, requesterId);
    if ('error' in summary) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(201).json(summary);
  } catch (error) {
    console.error('POST /api/expenses/split failed', error);
    return res.status(500).json({ message: 'Unable to split this expense right now.' });
  }
});

export default router;
