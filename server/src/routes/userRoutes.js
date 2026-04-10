import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
import { User } from '../models/User.js';
import { Vote } from '../models/Vote.js';
import { CANCELLED_TRIP_STATUS, COMPLETED_TRIP_STATUS, UPCOMING_TRIP_STATUS, isTripCurrentActive, normalizeTripRecordStatus, } from '../utils/tripRecordStatus.js';
const router = express.Router();
const toDate = (value) => {
    const parsedDate = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};
const toObjectId = (value) => new Types.ObjectId(value);
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
const toVerificationStatus = (user) => user.verificationStatus === 'rejected'
    ? 'rejected'
    : user.verificationStatus === 'verified' || Boolean(user.isVerified)
        ? 'verified'
        : 'pending';
const toPublicUser = (user) => ({
    id: String(user._id),
    userId: typeof user.userId === 'string' ? user.userId : '',
    provider: typeof user.provider === 'string' ? user.provider : 'Email',
    role: user.role === 'admin' ? 'admin' : 'user',
    isVerified: Boolean(user.isVerified),
    verificationStatus: toVerificationStatus(user),
});
router.get('/me', requireAuth, async (req, res) => {
    const authRequest = req;
    const userId = authRequest.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const user = await User.findById(userId)
            .select('_id userId provider role isVerified verificationStatus')
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
router.get('/dashboard-stats', requireAuth, async (req, res) => {
    const authRequest = req;
    const userId = authRequest.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const hostObjectId = toObjectId(userId);
        const now = new Date();
        const [trips, associatedTrips, pendingRequestCount, pendingJoinRequests] = await Promise.all([
            Trip.find({ organizerId: hostObjectId })
                .sort({ startDate: 1 })
                .select('_id title location startDate endDate status participants')
                .lean(),
            Trip.find({
                $or: [{ organizerId: hostObjectId }, { participants: hostObjectId }],
            })
                .sort({ startDate: 1 })
                .select('_id title location imageUrl startDate endDate status participants')
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
        const tripsWithNormalizedStatus = trips.map((trip) => ({
            ...trip,
            normalizedStatus: normalizeTripRecordStatus(trip.status, trip, now),
        }));
        const associatedTripsWithStatus = associatedTrips.map((trip) => ({
            ...trip,
            normalizedStatus: normalizeTripRecordStatus(trip.status, trip, now),
        }));
        const activeTrips = tripsWithNormalizedStatus.filter((trip) => {
            if (trip.normalizedStatus === CANCELLED_TRIP_STATUS) {
                return false;
            }
            return isTripCurrentActive(trip, now);
        });
        const futureTrips = tripsWithNormalizedStatus
            .map((trip) => {
            if (trip.normalizedStatus === CANCELLED_TRIP_STATUS) {
                return null;
            }
            const startDate = toDate(trip.startDate);
            return startDate ? { trip, startDate } : null;
        })
            .filter((entry) => Boolean(entry))
            .filter((entry) => entry.startDate > now)
            .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
        const nearestFutureTrip = futureTrips[0]?.trip ?? null;
        const totalParticipants = trips.reduce((count, trip) => count + getParticipantIds(trip.participants).length, 0);
        const completedTripsCount = tripsWithNormalizedStatus.filter((trip) => trip.normalizedStatus === COMPLETED_TRIP_STATUS).length;
        const upcomingTripsCount = tripsWithNormalizedStatus.filter((trip) => trip.normalizedStatus === UPCOMING_TRIP_STATUS).length;
        const activeTripsCount = activeTrips.length;
        const latestDecisionTripIds = associatedTripsWithStatus
            .filter((trip) => trip.normalizedStatus !== CANCELLED_TRIP_STATUS)
            .map((trip) => toObjectId(String(trip._id)));
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
        const latestDecision = latestDecisionTripIds.length
            ? await Vote.findOne({
                tripId: { $in: latestDecisionTripIds },
                status: 'decided',
            })
                .sort({ decisionMadeAt: -1, updatedAt: -1 })
                .select('_id tripId placeName imageUrl decisionMadeAt')
                .lean()
            : null;
        const associatedTripById = new Map();
        associatedTrips.forEach((trip) => {
            associatedTripById.set(String(trip._id), trip);
        });
        const latestDecisionTrip = latestDecision ? associatedTripById.get(String(latestDecision.tripId)) ?? null : null;
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
            latestDecision: latestDecision && latestDecisionTrip
                ? {
                    voteId: String(latestDecision._id),
                    tripId: String(latestDecision.tripId),
                    tripTitle: latestDecisionTrip.title,
                    tripLocation: latestDecisionTrip.location,
                    placeName: typeof latestDecision.placeName === 'string' && latestDecision.placeName.trim()
                        ? latestDecision.placeName.trim()
                        : 'Group decision',
                    imageUrl: typeof latestDecision.imageUrl === 'string' && latestDecision.imageUrl.trim()
                        ? latestDecision.imageUrl.trim()
                        : typeof latestDecisionTrip.imageUrl === 'string' && latestDecisionTrip.imageUrl.trim()
                            ? latestDecisionTrip.imageUrl.trim()
                            : null,
                    decisionMadeAt: latestDecision.decisionMadeAt ?? null,
                }
                : null,
        });
    }
    catch (error) {
        console.error('GET /api/users/dashboard-stats failed', error);
        return res.status(500).json({ message: 'Unable to load dashboard stats right now.' });
    }
});
export default router;
