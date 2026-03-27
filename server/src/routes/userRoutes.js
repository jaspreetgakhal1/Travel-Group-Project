import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Expense } from '../models/Expense.js';
import { Payment } from '../models/Payment.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
import { User } from '../models/User.js';

const router = express.Router();

const toDate = (value) => {
    const parsedDate = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toObjectId = (value) => new Types.ObjectId(value);
const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));

const getParticipantIds = (value) => Array.isArray(value) ? value.map((participantId) => String(participantId)) : [];

const getDisplayName = (user) => {
    const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
    const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
        return fullName;
    }
    if (typeof user.userId === 'string' && user.userId.trim()) {
        return user.userId.trim();
    }
    return 'Traveler';
};

const getAvatar = (user) => typeof user?.profileImageDataUrl === 'string' && user.profileImageDataUrl.trim()
    ? user.profileImageDataUrl.trim()
    : null;

const toVerificationStatus = (user) => user.verificationStatus === 'verified' || Boolean(user.isVerified) ? 'verified' : 'pending';

const toPublicUser = (user) => ({
    id: String(user._id),
    userId: typeof user.userId === 'string' ? user.userId : '',
    provider: typeof user.provider === 'string' ? user.provider : 'Email',
    isVerified: Boolean(user.isVerified),
    verificationStatus: toVerificationStatus(user),
});

const loadWalletSummary = async (userId) => {
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
        .select('_id organizerId title location imageUrl participants endDate')
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
    const [expenses, payments] = await Promise.all([
        Expense.find({ tripId: { $in: tripObjectIds } })
            .select('tripId settlements')
            .lean(),
        Payment.find({
            tripId: { $in: tripObjectIds },
            status: 'released',
            $or: [{ payerId: userObjectId }, { recipientUserId: userObjectId }],
        })
            .select('tripId payerId recipientUserId amount status createdAt')
            .lean(),
    ]);
    const tripById = new Map(activeTrips.map((trip) => [String(trip._id), trip]));
    const relatedUserIds = new Set([userId]);
    activeTrips.forEach((trip) => {
        relatedUserIds.add(String(trip.organizerId));
        getParticipantIds(trip.participants).forEach((participantId) => relatedUserIds.add(participantId));
    });
    payments.forEach((payment) => {
        relatedUserIds.add(String(payment.payerId));
        relatedUserIds.add(String(payment.recipientUserId));
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
        const tripId = String(expense.tripId);
        (Array.isArray(expense.settlements) ? expense.settlements : []).forEach((settlement) => {
            const debtorId = String(settlement.userId);
            if (debtorId !== userId) {
                return;
            }
            const creditorId = String(settlement.owesToUserId);
            const key = `${tripId}:${creditorId}`;
            outstandingByKey.set(key, {
                tripId,
                recipientUserId: creditorId,
                amountCents: (outstandingByKey.get(key)?.amountCents ?? 0) + toCents(settlement.amount),
            });
        });
    });
    const releasedByKey = new Map();
    payments
        .filter((payment) => String(payment.payerId) === userId && payment.status === 'released')
        .forEach((payment) => {
        const tripId = String(payment.tripId);
        const recipientUserId = String(payment.recipientUserId);
        const key = `${tripId}:${recipientUserId}`;
        releasedByKey.set(key, {
            tripId,
            recipientUserId,
            amountCents: (releasedByKey.get(key)?.amountCents ?? 0) + toCents(payment.amount),
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

router.get('/me', requireAuth, async (req, res) => {
    const authRequest = req;
    const userId = authRequest.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const user = await User.findById(userId)
            .select('_id userId provider isVerified verificationStatus')
            .lean();
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }
        return res.status(200).json({ user: toPublicUser(user) });
    }
    catch (error) {
        console.error('GET /api/users/me failed', error);
        return res.status(500).json({ message: 'Unable to fetch current user right now.' });
    }
});

router.get('/wallet-summary', requireAuth, async (req, res) => {
    const authRequest = req;
    const userId = authRequest.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const summary = await loadWalletSummary(userId);
        if ('error' in summary) {
            return res.status(summary.error.status).json({ message: summary.error.message });
        }
        return res.status(200).json(summary);
    }
    catch (error) {
        console.error('GET /api/users/wallet-summary failed', error);
        return res.status(500).json({ message: 'Unable to load wallet summary right now.' });
    }
});

router.post('/wallet-release', requireAuth, async (req, res) => {
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
    try {
        const summary = await loadWalletSummary(userId);
        if ('error' in summary) {
            return res.status(summary.error.status).json({ message: summary.error.message });
        }
        const matchingDebt = summary.paidEntries.find((entry) => entry.tripId === tripId && entry.recipientUserId === recipientUserId);
        if (!matchingDebt) {
            return res.status(404).json({ message: 'Outstanding debt not found for this trip.' });
        }
        const releaseAmountCents = toCents(amount);
        const outstandingAmountCents = toCents(matchingDebt.amount);
        if (releaseAmountCents <= 0 || releaseAmountCents > outstandingAmountCents) {
            return res.status(400).json({ message: 'Release amount exceeds the outstanding debt.' });
        }
        const payer = await User.findOneAndUpdate({
            _id: toObjectId(userId),
            escrowBalance: { $gte: fromCents(releaseAmountCents) },
        }, {
            $inc: { escrowBalance: -fromCents(releaseAmountCents) },
        }, {
            new: true,
        });
        if (!payer) {
            return res.status(400).json({ message: 'Insufficient escrow balance for this release.' });
        }
        const recipient = await User.findByIdAndUpdate(toObjectId(recipientUserId), {
            $inc: { escrowBalance: fromCents(releaseAmountCents) },
        }, {
            new: true,
        });
        if (!recipient) {
            await User.findByIdAndUpdate(toObjectId(userId), {
                $inc: { escrowBalance: fromCents(releaseAmountCents) },
            });
            return res.status(404).json({ message: 'Recipient user account not found.' });
        }
        await Payment.create({
            tripId: toObjectId(tripId),
            payerId: toObjectId(userId),
            recipientUserId: toObjectId(recipientUserId),
            amount: fromCents(releaseAmountCents),
            status: 'released',
        });
        const nextSummary = await loadWalletSummary(userId);
        if ('error' in nextSummary) {
            return res.status(nextSummary.error.status).json({ message: nextSummary.error.message });
        }
        return res.status(200).json(nextSummary);
    }
    catch (error) {
        console.error('POST /api/users/wallet-release failed', error);
        return res.status(500).json({ message: 'Unable to release this payment right now.' });
    }
});

router.get('/dashboard-stats', requireAuth, async (req, res) => {
    const authRequest = req;
    const userId = authRequest.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const hostObjectId = toObjectId(userId);
        const now = new Date();
        const [trips, pendingRequestCount, pendingJoinRequests] = await Promise.all([
            Trip.find({ organizerId: hostObjectId })
                .sort({ startDate: 1 })
                .select('_id title location startDate endDate participants')
                .lean(),
            TripJoinRequest.countDocuments({
                hostId: hostObjectId,
                status: 'pending',
            }),
            TripJoinRequest.find({
                hostId: hostObjectId,
                status: 'pending',
            })
                .sort({ createdAt: 1 })
                .limit(5)
                .select('_id tripId requesterId createdAt')
                .lean(),
        ]);
        const tripById = new Map();
        trips.forEach((trip) => {
            tripById.set(String(trip._id), trip);
        });
        const activeTrips = trips.filter((trip) => {
            const endDate = toDate(trip.endDate);
            return endDate ? endDate > now : false;
        });
        const futureTrips = trips
            .map((trip) => {
            const startDate = toDate(trip.startDate);
            return startDate ? { trip, startDate } : null;
        })
            .filter((entry) => Boolean(entry))
            .filter((entry) => entry.startDate > now)
            .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
        const nearestFutureTrip = futureTrips[0]?.trip ?? null;
        const totalParticipants = trips.reduce((count, trip) => count + getParticipantIds(trip.participants).length, 0);
        const completedTripsCount = trips.filter((trip) => {
            const endDate = toDate(trip.endDate);
            return endDate ? endDate <= now : false;
        }).length;
        const upcomingTripsCount = futureTrips.length;
        const activeTripsCount = activeTrips.length;
        const requesterObjectIds = Array.from(new Set(pendingJoinRequests
            .map((joinRequest) => String(joinRequest.requesterId))
            .filter((requesterId) => mongoose.isValidObjectId(requesterId)))).map((requesterId) => toObjectId(requesterId));
        const activeBuddyIds = Array.from(new Set(activeTrips
            .flatMap((trip) => getParticipantIds(trip.participants))
            .filter((participantId) => participantId !== userId && mongoose.isValidObjectId(participantId))));
        const buddyObjectIds = activeBuddyIds.map((participantId) => toObjectId(participantId));
        const userIdsToLoad = [...requesterObjectIds, ...buddyObjectIds];
        const uniqueUserIds = Array.from(new Map(userIdsToLoad.map((objectId) => [String(objectId), objectId])).values());
        const users = uniqueUserIds.length
            ? await User.find({ _id: { $in: uniqueUserIds } })
                .select('_id firstName lastName userId profileImageDataUrl')
                .lean()
            : [];
        const userById = new Map();
        users.forEach((user) => {
            userById.set(String(user._id), user);
        });
        return res.status(200).json({
            activeTripsCount,
            pendingRequests: pendingRequestCount,
            totalParticipants,
            upcomingDestination: nearestFutureTrip?.location ?? null,
            upcomingTrip: nearestFutureTrip
                ? {
                    id: String(nearestFutureTrip._id),
                    title: nearestFutureTrip.title,
                    location: nearestFutureTrip.location,
                    startDate: nearestFutureTrip.startDate,
                    endDate: nearestFutureTrip.endDate,
                    imageUrl: null,
                }
                : null,
            pendingRequestItems: pendingJoinRequests.map((joinRequest) => {
                const tripId = String(joinRequest.tripId);
                const requesterId = String(joinRequest.requesterId);
                const requester = userById.get(requesterId);
                return {
                    id: String(joinRequest._id),
                    tripId,
                    tripTitle: tripById.get(tripId)?.title ?? 'Untitled trip',
                    requesterId,
                    requesterName: requester ? getDisplayName(requester) : `Traveler ${requesterId.slice(-6)}`,
                    requesterAvatar: requester?.profileImageDataUrl ?? null,
                    requestedAt: joinRequest.createdAt,
                };
            }),
            activeTripBuddies: activeBuddyIds.map((participantId) => {
                const user = userById.get(participantId);
                return {
                    id: participantId,
                    name: user ? getDisplayName(user) : `Traveler ${participantId.slice(-6)}`,
                    profileImageDataUrl: user?.profileImageDataUrl ?? null,
                };
            }),
            completedTripsCount,
            upcomingTripsCount,
            totalTripsCount: trips.length,
        });
    }
    catch (error) {
        console.error('GET /api/users/dashboard-stats failed', error);
        return res.status(500).json({ message: 'Unable to load dashboard stats right now.' });
    }
});

export default router;
