import mongoose, { Types } from 'mongoose';
import { Expense } from '../models/Expense.js';
import { Transaction } from '../models/Transaction.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';

export const toCents = (value) => Math.round(Number(value || 0) * 100);
export const fromCents = (value) => Number((value / 100).toFixed(2));

const getParticipantIds = (value) => (Array.isArray(value) ? value.map((participantId) => String(participantId)) : []);

const getDisplayName = (user) => {
  const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.userId || user?.email || 'Traveler';
};

const getAvatar = (user) =>
  typeof user?.profileImageDataUrl === 'string' && user.profileImageDataUrl.trim() ? user.profileImageDataUrl.trim() : null;

const toObjectId = (value) => new Types.ObjectId(value);

export const loadTripContext = async (tripId, requesterId) => {
  if (!mongoose.isValidObjectId(tripId) || !requesterId || !mongoose.isValidObjectId(requesterId)) {
    return { error: { status: 400, message: 'Trip id is invalid.' } };
  }

  const trip = await Trip.findById(tripId).select('_id organizerId title location imageUrl participants endDate').lean();
  if (!trip) {
    return { error: { status: 404, message: 'Trip not found.' } };
  }

  const orderedMemberIds = Array.from(
    new Set([
      String(trip.organizerId),
      ...(Array.isArray(trip.participants) ? trip.participants.map((participantId) => String(participantId)) : []),
    ]),
  );

  if (!orderedMemberIds.includes(requesterId)) {
    return { error: { status: 403, message: 'Only trip members can access settlement details for this trip.' } };
  }

  const users = await User.find({ _id: { $in: orderedMemberIds.map((memberId) => toObjectId(memberId)) } })
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
          name: getDisplayName(user),
          avatar: getAvatar(user),
          isHost: userId === String(trip.organizerId),
        };
      })
      .filter(Boolean),
  };
};

export const buildTripSettlement = async (tripId, requesterId) => {
  const context = await loadTripContext(tripId, requesterId);
  if ('error' in context) {
    return context;
  }

  const { trip, members } = context;
  const membersById = new Map(members.map((member) => [member.id, member]));
  const expenses = await Expense.find({ tripId }).sort({ createdAt: -1 }).lean();
  const settlementByPair = new Map();
  const balancesByUserId = new Map(
    members.map((member) => [
      member.id,
      {
        userId: member.id,
        name: member.name,
        avatar: member.avatar,
        totalSpentCents: 0,
        equalShareCents: 0,
      },
    ]),
  );

  let totalExpenseCents = 0;

  const serializedExpenses = expenses.map((expense) => {
    const payerId = String(expense.paidBy);
    const payer = membersById.get(payerId);
    const createdById = expense.createdBy ? String(expense.createdBy) : payerId;
    const lastUpdatedById = expense.lastUpdatedBy ? String(expense.lastUpdatedBy) : null;
    const expenseAmountCents = toCents(expense.amount);
    totalExpenseCents += expenseAmountCents;

    const payerBalance = balancesByUserId.get(payerId);
    if (payerBalance) {
      payerBalance.totalSpentCents += expenseAmountCents;
    }

    let settlementTotalCents = 0;

    const settlements = (Array.isArray(expense.settlements) ? expense.settlements : []).map((settlement) => {
      const debtorId = String(settlement.userId);
      const creditorId = String(settlement.owesToUserId);
      const debtor = membersById.get(debtorId);
      const creditor = membersById.get(creditorId);
      const amountCents = toCents(settlement.amount);
      settlementTotalCents += amountCents;
      const amount = fromCents(amountCents);
      const pairKey = `${debtorId}->${creditorId}`;

      settlementByPair.set(pairKey, {
        fromUserId: debtorId,
        fromName: debtor?.name ?? 'Traveler',
        toUserId: creditorId,
        toName: creditor?.name ?? 'Traveler',
        amount: fromCents((settlementByPair.get(pairKey)?.amountCents ?? 0) + amountCents),
        amountCents: (settlementByPair.get(pairKey)?.amountCents ?? 0) + amountCents,
      });

      const debtorBalance = balancesByUserId.get(debtorId);
      if (debtorBalance) {
        debtorBalance.equalShareCents += amountCents;
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

    if (payerBalance) {
      payerBalance.equalShareCents += Math.max(0, expenseAmountCents - settlementTotalCents);
    }

    return {
      id: String(expense._id),
      description: expense.description,
      amount: fromCents(expenseAmountCents),
      splitAmount: fromCents(toCents(expense.splitAmount)),
      memberCount: expense.memberCount,
      createdBy: createdById,
      lastUpdatedBy: lastUpdatedById,
      lastUpdatedByName: lastUpdatedById ? membersById.get(lastUpdatedById)?.name ?? 'Traveler' : null,
      paidBy: {
        userId: payerId,
        name: payer?.name ?? 'Traveler',
        avatar: payer?.avatar ?? null,
      },
      settlements,
      createdAt: expense.createdAt instanceof Date ? expense.createdAt.toISOString() : new Date(expense.createdAt).toISOString(),
      updatedAt: expense.updatedAt instanceof Date ? expense.updatedAt.toISOString() : new Date(expense.updatedAt).toISOString(),
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
    totalExpenses: fromCents(totalExpenseCents),
    settlementSummary: Array.from(settlementByPair.values())
      .map(({ amountCents, ...rest }) => ({ ...rest, amount: fromCents(amountCents) }))
      .sort((left, right) => right.amount - left.amount),
    balances: Array.from(balancesByUserId.values()).map((balance) => {
      const totalSpent = fromCents(balance.totalSpentCents);
      const equalShare = fromCents(balance.equalShareCents);
      const netBalanceCents = balance.totalSpentCents - balance.equalShareCents;

      return {
        userId: balance.userId,
        name: balance.name,
        avatar: balance.avatar,
        totalSpent,
        equalShare,
        totalOwed: netBalanceCents < 0 ? fromCents(Math.abs(netBalanceCents)) : 0,
        totalReceivable: netBalanceCents > 0 ? fromCents(netBalanceCents) : 0,
        netBalance: fromCents(netBalanceCents),
      };
    }),
  };
};

export const buildWalletSummary = async (userId) => {
  const now = new Date();
  const userObjectId = toObjectId(userId);
  const currentUser = await User.findById(userObjectId)
    .select('_id escrowBalance userId firstName lastName profileImageDataUrl')
    .lean();

  if (!currentUser) {
    return { error: { status: 404, message: 'User account not found.' } };
  }

  const activeTrips = await Trip.find({
    endDate: { $gt: now },
    $or: [{ organizerId: userObjectId }, { participants: userObjectId }],
  })
    .select('_id organizerId title location imageUrl participants')
    .lean();

  const tripIds = activeTrips.map((trip) => String(trip._id));
  if (tripIds.length === 0) {
    return {
      paidTotal: 0,
      releasedTotal: 0,
      escrowBalance: fromCents(toCents(currentUser.escrowBalance ?? 500)),
      paidEntries: [],
      releasedEntries: [],
    };
  }

  const tripObjectIds = tripIds.map((tripId) => toObjectId(tripId));
  const [expenses, transactions] = await Promise.all([
    Expense.find({ tripId: { $in: tripObjectIds } }).select('tripId settlements').lean(),
    Transaction.find({
      tripId: { $in: tripObjectIds },
      status: 'released',
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .select('tripId senderId receiverId amount status createdAt')
      .lean(),
  ]);

  const tripById = new Map(activeTrips.map((trip) => [String(trip._id), trip]));
  const relatedUserIds = new Set([userId]);
  activeTrips.forEach((trip) => {
    relatedUserIds.add(String(trip.organizerId));
    getParticipantIds(trip.participants).forEach((participantId) => relatedUserIds.add(participantId));
  });
  transactions.forEach((transaction) => {
    relatedUserIds.add(String(transaction.senderId));
    relatedUserIds.add(String(transaction.receiverId));
  });

  const relatedUsers = await User.find({
    _id: {
      $in: Array.from(relatedUserIds)
        .filter((candidateId) => mongoose.isValidObjectId(candidateId))
        .map((candidateId) => toObjectId(candidateId)),
    },
  })
    .select('_id firstName lastName userId profileImageDataUrl')
    .lean();
  const userById = new Map(relatedUsers.map((user) => [String(user._id), user]));

  const outstandingByKey = new Map();
  expenses.forEach((expense) => {
    const currentTripId = String(expense.tripId);
    (Array.isArray(expense.settlements) ? expense.settlements : []).forEach((settlement) => {
      const debtorId = String(settlement.userId);
      if (debtorId !== userId) {
        return;
      }

      const creditorId = String(settlement.owesToUserId);
      const key = `${currentTripId}:${creditorId}`;
      outstandingByKey.set(key, {
        tripId: currentTripId,
        recipientUserId: creditorId,
        amountCents: (outstandingByKey.get(key)?.amountCents ?? 0) + toCents(settlement.amount),
      });
    });
  });

  const releasedByKey = new Map();
  transactions
    .filter((transaction) => String(transaction.senderId) === userId && transaction.status === 'released')
    .forEach((transaction) => {
      const currentTripId = String(transaction.tripId);
      const recipientUserId = String(transaction.receiverId);
      const key = `${currentTripId}:${recipientUserId}`;
      releasedByKey.set(key, {
        tripId: currentTripId,
        recipientUserId,
        amountCents: (releasedByKey.get(key)?.amountCents ?? 0) + toCents(transaction.amount),
      });
    });

  const paidEntries = Array.from(outstandingByKey.values())
    .map((entry) => {
      const releasedAmountCents = releasedByKey.get(`${entry.tripId}:${entry.recipientUserId}`)?.amountCents ?? 0;
      const amountCents = Math.max(0, entry.amountCents - releasedAmountCents);
      if (amountCents <= 0) {
        return null;
      }

      const recipient = userById.get(entry.recipientUserId);
      const trip = tripById.get(entry.tripId);
      return {
        id: `paid:${entry.tripId}:${entry.recipientUserId}`,
        tripId: entry.tripId,
        tripTitle: trip?.title ?? 'Untitled trip',
        recipientUserId: entry.recipientUserId,
        recipientName: recipient ? getDisplayName(recipient) : 'Traveler',
        recipientAvatar: getAvatar(recipient),
        amount: fromCents(amountCents),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.amount - left.amount);

  const releasedEntries = Array.from(releasedByKey.values())
    .map((entry) => {
      const recipient = userById.get(entry.recipientUserId);
      const trip = tripById.get(entry.tripId);
      return {
        id: `released:${entry.tripId}:${entry.recipientUserId}`,
        tripId: entry.tripId,
        tripTitle: trip?.title ?? 'Untitled trip',
        recipientUserId: entry.recipientUserId,
        recipientName: recipient ? getDisplayName(recipient) : 'Traveler',
        recipientAvatar: getAvatar(recipient),
        amount: fromCents(entry.amountCents),
      };
    })
    .sort((left, right) => right.amount - left.amount);

  return {
    paidTotal: fromCents(paidEntries.reduce((total, entry) => total + toCents(entry.amount), 0)),
    releasedTotal: fromCents(releasedEntries.reduce((total, entry) => total + toCents(entry.amount), 0)),
    escrowBalance: fromCents(toCents(currentUser.escrowBalance ?? 500)),
    paidEntries,
    releasedEntries,
  };
};
