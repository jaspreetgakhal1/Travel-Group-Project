import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Expense } from '../models/Expense.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import { buildTripSettlement } from '../utils/wallet.js';
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

const normalizeDebtorIds = (debtorIds: unknown): string[] => {
  if (!Array.isArray(debtorIds)) {
    return [];
  }

  return Array.from(
    new Set(
      debtorIds
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim()),
    ),
  );
};

const buildSettlements = (requesterId: string, debtorMemberIds: string[], amount: number) => {
  const memberCount = debtorMemberIds.length + 1;
  const totalCents = Math.round(amount * 100);
  const baseShareCents = Math.floor(totalCents / memberCount);
  const splitAmount = roundCurrency(baseShareCents / 100);

  return {
    splitAmount,
    memberCount,
    settlements: debtorMemberIds.map((memberId) => ({
      userId: new mongoose.Types.ObjectId(memberId),
      owesToUserId: new mongoose.Types.ObjectId(requesterId),
      amount: splitAmount,
    })),
  };
};

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

const loadExpenseContext = async (expenseId: string, requesterId: string | undefined) => {
  if (!mongoose.isValidObjectId(expenseId)) {
    return { error: { status: 400, message: 'Expense id is invalid.' } } as const;
  }

  const expense = await Expense.findById(expenseId)
    .select('_id tripId paidBy createdBy')
    .lean();
  if (!expense) {
    return { error: { status: 404, message: 'Expense not found.' } } as const;
  }

  const context = await loadTripContext(String(expense.tripId), requesterId);
  if ('error' in context) {
    return context;
  }

  return { expense, context } as const;
};

router.get('/trips/:tripId', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';

  try {
    const summary = await buildTripSettlement(tripId, authRequest.user?.id);
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
  const { tripId, description, amount, debtorIds } = req.body as {
    tripId?: unknown;
    description?: unknown;
    amount?: unknown;
    debtorIds?: unknown;
  };

  if (
    typeof tripId !== 'string' ||
    typeof description !== 'string' ||
    typeof amount !== 'number' ||
    !Array.isArray(debtorIds)
  ) {
    return res.status(400).json({ message: 'Trip id, description, amount, and debtor ids are required.' });
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

    if (!requesterId) {
      return res.status(400).json({ message: 'Trip has no members to split with.' });
    }

    const memberIds = context.members.map((member) => member.id);
    const debtorMemberIds = normalizeDebtorIds(debtorIds);

    const hasInvalidDebtor = debtorMemberIds.some((memberId) => memberId === requesterId || !memberIds.includes(memberId));
    if (hasInvalidDebtor) {
      return res.status(400).json({ message: 'Debtor ids must belong to other active trip members.' });
    }

    if (debtorMemberIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one trip member for this expense.' });
    }

    const { splitAmount, memberCount, settlements } = buildSettlements(requesterId, debtorMemberIds, amount);

    await Expense.create({
      tripId: new mongoose.Types.ObjectId(tripId),
      paidBy: new mongoose.Types.ObjectId(requesterId),
      createdBy: new mongoose.Types.ObjectId(requesterId),
      lastUpdatedBy: null,
      description: normalizedDescription,
      amount: roundCurrency(amount),
      splitAmount,
      memberCount,
      memberUserIds: [requesterId, ...debtorMemberIds].map((memberId) => new mongoose.Types.ObjectId(memberId)),
      debtorUserIds: debtorMemberIds.map((memberId) => new mongoose.Types.ObjectId(memberId)),
      settlements,
    });

    const summary = await buildTripSettlement(tripId, requesterId);
    if ('error' in summary) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(201).json(summary);
  } catch (error) {
    console.error('POST /api/expenses/split failed', error);
    return res.status(500).json({ message: 'Unable to split this expense right now.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const requesterId = authRequest.user?.id;
  const expenseId = typeof req.params.id === 'string' ? req.params.id : '';
  const { description, amount, debtorIds } = req.body as {
    description?: unknown;
    amount?: unknown;
    debtorIds?: unknown;
  };

  if (typeof description !== 'string' || typeof amount !== 'number' || !Array.isArray(debtorIds)) {
    return res.status(400).json({ message: 'Description, amount, and debtor ids are required.' });
  }

  const normalizedDescription = description.trim();
  if (normalizedDescription.length < 2) {
    return res.status(400).json({ message: 'Description must be at least 2 characters.' });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0.' });
  }

  try {
    const expenseContext = await loadExpenseContext(expenseId, requesterId);
    if (!('expense' in expenseContext)) {
      return res.status(expenseContext.error.status).json({ message: expenseContext.error.message });
    }

    if (!requesterId) {
      return res.status(401).json({ message: 'Unauthorized request.' });
    }

    const memberIds = expenseContext.context.members.map((member) => member.id);
    const debtorMemberIds = normalizeDebtorIds(debtorIds);
    const hasInvalidDebtor = debtorMemberIds.some((memberId) => memberId === requesterId || !memberIds.includes(memberId));
    if (hasInvalidDebtor) {
      return res.status(400).json({ message: 'Debtor ids must belong to other active trip members.' });
    }

    if (debtorMemberIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one trip member for this expense.' });
    }

    const { splitAmount, memberCount, settlements } = buildSettlements(requesterId, debtorMemberIds, amount);

    await Expense.findByIdAndUpdate(expenseId, {
      $set: {
        description: normalizedDescription,
        amount: roundCurrency(amount),
        splitAmount,
        memberCount,
        memberUserIds: [requesterId, ...debtorMemberIds].map((memberId) => new mongoose.Types.ObjectId(memberId)),
        debtorUserIds: debtorMemberIds.map((memberId) => new mongoose.Types.ObjectId(memberId)),
        settlements,
        lastUpdatedBy: new mongoose.Types.ObjectId(requesterId),
      },
    });

    const summary = await buildTripSettlement(String(expenseContext.expense.tripId), requesterId);
    if ('error' in summary) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('PUT /api/expenses/:id failed', error);
    return res.status(500).json({ message: 'Unable to update this expense right now.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const requesterId = authRequest.user?.id;
  const expenseId = typeof req.params.id === 'string' ? req.params.id : '';

  try {
    const expenseContext = await loadExpenseContext(expenseId, requesterId);
    if (!('expense' in expenseContext)) {
      return res.status(expenseContext.error.status).json({ message: expenseContext.error.message });
    }

    const createdById = expenseContext.expense.createdBy
      ? String(expenseContext.expense.createdBy)
      : String(expenseContext.expense.paidBy);
    if (requesterId !== createdById) {
      return res.status(403).json({ message: 'Only the creator of this expense can delete it.' });
    }

    await Expense.findByIdAndDelete(expenseId);

    const summary = await buildTripSettlement(String(expenseContext.expense.tripId), requesterId);
    if ('error' in summary) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('DELETE /api/expenses/:id failed', error);
    return res.status(500).json({ message: 'Unable to delete this expense right now.' });
  }
});

export default router;
