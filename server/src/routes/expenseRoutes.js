import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Expense } from '../models/Expense.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
const router = express.Router();
const roundCurrency = (value) => Math.round(value * 100) / 100;
const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));
const buildDisplayName = (user) => {
    const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
    const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.userId || user?.email || 'Traveler';
};
const getAvatar = (user) => typeof user?.profileImageDataUrl === 'string' && user.profileImageDataUrl.trim() ? user.profileImageDataUrl.trim() : null;
const loadTripContext = async (tripId, requesterId) => {
    if (!mongoose.isValidObjectId(tripId) || !requesterId || !mongoose.isValidObjectId(requesterId)) {
        return { error: { status: 400, message: 'Trip id is invalid.' } };
    }
    const trip = await Trip.findById(tripId)
        .select('_id organizerId title location imageUrl participants')
        .lean();
    if (!trip) {
        return { error: { status: 404, message: 'Trip not found.' } };
    }
    const orderedMemberIds = Array.from(new Set([
        String(trip.organizerId),
        ...(Array.isArray(trip.participants) ? trip.participants.map((participantId) => String(participantId)) : []),
    ]));
    if (!orderedMemberIds.includes(requesterId)) {
        return { error: { status: 403, message: 'Only trip members can split bills for this trip.' } };
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
            .filter((member) => Boolean(member)),
    };
};
const buildExpenseSummary = async (tripId, requesterId) => {
    const context = await loadTripContext(tripId, requesterId);
    if ('error' in context) {
        return context;
    }
    const { trip, members } = context;
    const membersById = new Map(members.map((member) => [member.id, member]));
    const expenses = await Expense.find({ tripId })
        .sort({ createdAt: -1 })
        .lean();
    const settlementByPair = new Map();
    const balancesByUserId = new Map(members.map((member) => [
        member.id,
        {
            userId: member.id,
            name: member.name,
            avatar: member.avatar,
            totalSpentCents: 0,
            equalShareCents: 0,
        },
    ]));
    let totalExpenseCents = 0;
    const serializedExpenses = expenses.map((expense) => {
        const payerId = String(expense.paidBy);
        const payer = membersById.get(payerId);
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
                fromAvatar: debtor?.avatar ?? null,
                toAvatar: creditor?.avatar ?? null,
                amount: roundCurrency((settlementByPair.get(pairKey)?.amount ?? 0) + amount),
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
        totalExpenses: fromCents(totalExpenseCents),
        settlementSummary: Array.from(settlementByPair.values()).sort((left, right) => right.amount - left.amount),
        balances: Array.from(balancesByUserId.values()).map((balance) => {
            const totalSpent = fromCents(balance.totalSpentCents);
            const equalShare = fromCents(balance.equalShareCents);
            const netBalance = fromCents(balance.totalSpentCents - balance.equalShareCents);
            return {
                userId: balance.userId,
                name: balance.name,
                avatar: balance.avatar,
                totalSpent,
                equalShare,
                totalOwed: netBalance < 0 ? fromCents(Math.abs(balance.totalSpentCents - balance.equalShareCents)) : 0,
                totalReceivable: netBalance > 0 ? netBalance : 0,
                netBalance,
            };
        }),
    };
};
router.get('/trips/:tripId', requireAuth, async (req, res) => {
    const authRequest = req;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    try {
        const summary = await buildExpenseSummary(tripId, authRequest.user?.id);
        if ('error' in summary) {
            return res.status(summary.error.status).json({ message: summary.error.message });
        }
        return res.status(200).json(summary);
    }
    catch (error) {
        console.error('GET /api/expenses/trips/:tripId failed', error);
        return res.status(500).json({ message: 'Unable to load trip expenses right now.' });
    }
});
router.post('/split', requireAuth, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const { tripId, description, amount } = req.body;
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
        const remainderCents = totalCents - (baseShareCents * memberCount);
        const shareByMemberId = new Map(memberIds.map((memberId, index) => [
            memberId,
            baseShareCents + (index < remainderCents ? 1 : 0),
        ]));
        const splitAmount = fromCents(Math.round(totalCents / memberCount));
        const settlements = memberIds
            .filter((memberId) => memberId !== requesterId)
            .map((memberId) => ({
            userId: new mongoose.Types.ObjectId(memberId),
            owesToUserId: new mongoose.Types.ObjectId(requesterId),
            amount: fromCents(shareByMemberId.get(memberId) ?? 0),
        }));
        await Expense.create({
            tripId: new mongoose.Types.ObjectId(tripId),
            paidBy: new mongoose.Types.ObjectId(requesterId),
            description: normalizedDescription,
            amount: fromCents(totalCents),
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
    }
    catch (error) {
        console.error('POST /api/expenses/split failed', error);
        return res.status(500).json({ message: 'Unable to split this expense right now.' });
    }
});
export default router;
