import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyTripAccess } from '../middleware/verifyTripAccess.js';
import { Participant } from '../models/Participant.js';
import { Notification } from '../models/Notification.js';
import { Post } from '../models/Post.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
import { User } from '../models/User.js';
import { Vote } from '../models/Vote.js';
import { CANCELLED_TRIP_STATUS, CANCELLED_TRIP_STATUS_VALUES, COMPLETED_TRIP_STATUS, COMPLETED_TRIP_STATUS_VALUES, TRIP_OVERLAP_ERROR_MESSAGE, findTripOverlap, toDayEnd, toDayStart, } from '../utils/tripScheduling.js';
import { normalizeTripRecordStatus } from '../utils/tripRecordStatus.js';
import { markPastTripsCompleted } from '../utils/expireTrips.js';
import { generateTripSuggestions } from '../utils/geminiTripSuggestions.js';
import { buildTripSettlement } from '../utils/wallet.js';
const router = express.Router();
const REQUEST_STATUSES = ['pending', 'accepted', 'rejected'];
const isRequestStatus = (value) => typeof value === 'string' && REQUEST_STATUSES.includes(value);
const normalizeAuthorKey = (value) => value.trim().toLowerCase();
const getReferencedUserId = (value) => {
    if (value instanceof Types.ObjectId) {
        return String(value);
    }
    if (typeof value === 'string') {
        return value;
    }
    if (value && typeof value === 'object') {
        const candidate = value;
        if (candidate._id instanceof Types.ObjectId || typeof candidate._id === 'string') {
            return String(candidate._id);
        }
        if (typeof candidate.id === 'string') {
            return candidate.id;
        }
    }
    return '';
};
const getParticipantIds = (value) => Array.isArray(value) ? value.map((participantId) => getReferencedUserId(participantId)).filter(Boolean) : [];
const getUniqueTripMemberIds = (organizerId, participants) => Array.from(new Set([getReferencedUserId(organizerId), ...getParticipantIds(participants)].filter(Boolean)));
const getDisplayName = (user, fallback = 'Traveler') => {
    const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
    const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
        return fullName;
    }
    if (typeof user?.userId === 'string' && user.userId.trim()) {
        return user.userId.trim();
    }
    return fallback;
};
const getProfileImageDataUrl = (user) => typeof user?.profileImageDataUrl === 'string' && user.profileImageDataUrl.trim() ? user.profileImageDataUrl.trim() : null;
const getSpotsFilledPercent = (spotsFilled, maxParticipants) => {
    if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) {
        return 0;
    }
    return Math.min(100, Math.round((spotsFilled / maxParticipants) * 100));
};
const parseTripDate = (value, fallbackDate) => {
    const parsedDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return new Date(fallbackDate);
    }
    return parsedDate;
};
const getTripStatus = (value, trip = {}) => normalizeTripRecordStatus(value, trip);
const tripSuggestionStreams = new Map();
let nextTripSuggestionStreamId = 1;
const voteSessionStreams = new Map();
let nextVoteSessionStreamId = 1;
const getSuggestionTravelerTypeFallback = (category) => {
    if (typeof category === 'string' && category.trim()) {
        return `${category.trim()} travelers`;
    }
    return 'collaborative travelers';
};
const normalizePreferenceValue = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const getRequiredVoteCount = (memberCount) => Math.max(1, Math.floor(memberCount / 2) + 1);
const normalizeStoredSuggestionPreferences = (value) => {
    const preferenceValue = value;
    if (!preferenceValue) {
        return null;
    }
    const collectiveMood = normalizePreferenceValue(preferenceValue.collectiveMood, '');
    const interest = normalizePreferenceValue(preferenceValue.interest, '');
    const budget = normalizePreferenceValue(preferenceValue.budget, '');
    const food = normalizePreferenceValue(preferenceValue.food, '');
    const crowds = normalizePreferenceValue(preferenceValue.crowds, '');
    if (!collectiveMood || !interest || !budget || !food || !crowds) {
        return null;
    }
    return {
        collectiveMood,
        interest,
        budget,
        food,
        crowds,
    };
};
const writeSuggestionStreamEvent = (response, payload) => {
    response.write('event: suggestions\n');
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
};
const removeTripSuggestionStreamClient = (tripId, clientId) => {
    const tripClients = tripSuggestionStreams.get(tripId);
    const client = tripClients?.get(clientId);
    if (client) {
        clearInterval(client.heartbeatId);
    }
    tripClients?.delete(clientId);
    if (tripClients && tripClients.size === 0) {
        tripSuggestionStreams.delete(tripId);
    }
};
const loadTripSuggestionContext = async (tripId) => {
    const trip = await Trip.findById(tripId)
        .select('_id title location travelerType category organizerId participants suggestions suggestionPreferences suggestionsGeneratedAt')
        .lean();
    if (!trip) {
        return null;
    }
    let travelerType = typeof trip.travelerType === 'string' && trip.travelerType.trim() ? trip.travelerType.trim() : '';
    if (!travelerType) {
        const post = await Post.findById(tripId).select('travelerType').lean();
        travelerType =
            typeof post?.travelerType === 'string' && post.travelerType.trim()
                ? post.travelerType.trim()
                : getSuggestionTravelerTypeFallback(trip.category);
    }
    return {
        tripId: String(trip._id),
        title: trip.title,
        destination: trip.location,
        travelerType,
        totalTravelers: Math.max(1, getUniqueTripMemberIds(trip.organizerId, trip.participants).length),
        generatedPreferences: normalizeStoredSuggestionPreferences(trip.suggestionPreferences),
        generatedAt: trip.suggestionsGeneratedAt instanceof Date
            ? trip.suggestionsGeneratedAt.toISOString()
            : trip.suggestionsGeneratedAt
                ? new Date(trip.suggestionsGeneratedAt).toISOString()
                : null,
        suggestions: (Array.isArray(trip.suggestions) ? trip.suggestions : []).map((suggestion) => ({
            id: String(suggestion._id),
            name: typeof suggestion.name === 'string' ? suggestion.name.trim() : 'Suggested stop',
            whyVisit: typeof suggestion.whyVisit === 'string' && suggestion.whyVisit.trim()
                ? suggestion.whyVisit.trim()
                : 'A strong fit for this group trip.',
            estimatedCostPerPerson: typeof suggestion.estimatedCostPerPerson === 'number' && Number.isFinite(suggestion.estimatedCostPerPerson)
                ? Number(suggestion.estimatedCostPerPerson.toFixed(2))
                : 0,
            vibeMatchPercent: typeof suggestion.vibeMatchPercent === 'number' && Number.isFinite(suggestion.vibeMatchPercent)
                ? Math.max(0, Math.min(100, Math.round(suggestion.vibeMatchPercent)))
                : 0,
            imageUrl: typeof suggestion.imageUrl === 'string' && suggestion.imageUrl.trim() ? suggestion.imageUrl.trim() : '',
            voteUserIds: getParticipantIds(suggestion.voteUserIds),
        })),
    };
};
const serializeTripSuggestions = (context, viewerUserId, voteRoomBySuggestionId) => {
    const highestVoteCount = context.suggestions.reduce((currentHighest, suggestion) => Math.max(currentHighest, suggestion.voteUserIds.length), 0);
    const leaderSuggestionIds = highestVoteCount > 0
        ? context.suggestions
            .filter((suggestion) => suggestion.voteUserIds.length === highestVoteCount)
            .map((suggestion) => suggestion.id)
        : [];
    const winningSuggestionId = leaderSuggestionIds.length === 1 ? leaderSuggestionIds[0] : null;
    return {
        tripId: context.tripId,
        title: context.title,
        destination: context.destination,
        travelerType: context.travelerType,
        totalTravelers: context.totalTravelers,
        generatedPreferences: context.generatedPreferences,
        generatedAt: context.generatedAt,
        suggestions: context.suggestions.map((suggestion) => {
            const voteCount = suggestion.voteUserIds.length;
            return {
                id: suggestion.id,
                name: suggestion.name,
                whyVisit: suggestion.whyVisit,
                estimatedCostPerPerson: suggestion.estimatedCostPerPerson,
                vibeMatchPercent: suggestion.vibeMatchPercent,
                imageUrl: suggestion.imageUrl,
                voteCount,
                votePercent: context.totalTravelers > 0 ? Number(((voteCount / context.totalTravelers) * 100).toFixed(2)) : 0,
                hasVoted: suggestion.voteUserIds.includes(viewerUserId),
                isLeader: leaderSuggestionIds.includes(suggestion.id),
                isWinningSuggestion: winningSuggestionId === suggestion.id,
                voteRoom: voteRoomBySuggestionId.get(suggestion.id) ?? null,
            };
        }),
    };
};
const loadSuggestionVoteRoomSummaries = async (tripId, suggestionIds, totalTravelers) => {
    if (!suggestionIds.length) {
        return new Map();
    }
    const voteSessions = await Vote.find({
        tripId: new Types.ObjectId(tripId),
        sourceSuggestionId: { $in: suggestionIds },
        status: { $in: ['open', 'decided'] },
    })
        .sort({ updatedAt: -1, createdAt: -1 })
        .select('_id sourceSuggestionId status votes decisionMadeAt')
        .lean();
    const summaryBySuggestionId = new Map();
    voteSessions.forEach((session) => {
        const sourceSuggestionId = typeof session.sourceSuggestionId === 'string' ? session.sourceSuggestionId.trim() : '';
        if (!sourceSuggestionId || summaryBySuggestionId.has(sourceSuggestionId)) {
            return;
        }
        const decisionMadeAt = session.decisionMadeAt instanceof Date
            ? session.decisionMadeAt.toISOString()
            : session.decisionMadeAt
                ? new Date(session.decisionMadeAt).toISOString()
                : null;
        summaryBySuggestionId.set(sourceSuggestionId, {
            id: String(session._id),
            sourceSuggestionId,
            status: session.status,
            votedCount: getParticipantIds(session.votes).length,
            requiredVotes: getRequiredVoteCount(totalTravelers),
            decisionMadeAt,
        });
    });
    return summaryBySuggestionId;
};
const buildTripSuggestionsPayload = async (tripId, viewerUserId) => {
    const context = await loadTripSuggestionContext(tripId);
    if (!context) {
        return null;
    }
    const voteRoomBySuggestionId = await loadSuggestionVoteRoomSummaries(tripId, context.suggestions.map((suggestion) => suggestion.id), context.totalTravelers);
    return serializeTripSuggestions(context, viewerUserId, voteRoomBySuggestionId);
};
const broadcastTripSuggestions = async (tripId) => {
    const tripClients = tripSuggestionStreams.get(tripId);
    if (!tripClients || tripClients.size === 0) {
        return;
    }
    const context = await loadTripSuggestionContext(tripId);
    if (!context) {
        for (const clientId of tripClients.keys()) {
            removeTripSuggestionStreamClient(tripId, clientId);
        }
        return;
    }
    const voteRoomBySuggestionId = await loadSuggestionVoteRoomSummaries(tripId, context.suggestions.map((suggestion) => suggestion.id), context.totalTravelers);
    for (const [clientId, client] of tripClients.entries()) {
        try {
            writeSuggestionStreamEvent(client.response, serializeTripSuggestions(context, client.userId, voteRoomBySuggestionId));
        }
        catch {
            removeTripSuggestionStreamClient(tripId, clientId);
        }
    }
};
const loadTripVoteBaseContext = async (tripId) => {
    const trip = await Trip.findById(tripId).select('_id title location imageUrl organizerId participants').lean();
    if (!trip) {
        return null;
    }
    const organizerId = getReferencedUserId(trip.organizerId);
    const memberIds = getUniqueTripMemberIds(trip.organizerId, trip.participants);
    const validMemberIds = memberIds
        .filter((memberId) => mongoose.isValidObjectId(memberId))
        .map((memberId) => new Types.ObjectId(memberId));
    const users = validMemberIds.length
        ? await User.find({ _id: { $in: validMemberIds } })
            .select('_id firstName lastName userId profileImageDataUrl')
            .lean()
        : [];
    const userById = new Map();
    users.forEach((user) => {
        userById.set(String(user._id), user);
    });
    return {
        tripId: String(trip._id),
        tripTitle: typeof trip.title === 'string' && trip.title.trim() ? trip.title.trim() : 'Untitled trip',
        tripLocation: typeof trip.location === 'string' && trip.location.trim() ? trip.location.trim() : 'Destination TBD',
        tripImageUrl: typeof trip.imageUrl === 'string' ? trip.imageUrl.trim() : '',
        organizerId,
        members: memberIds.map((memberId) => {
            const user = userById.get(memberId);
            return {
                id: memberId,
                name: getDisplayName(user),
                avatar: getProfileImageDataUrl(user),
                isHost: memberId === organizerId,
            };
        }),
    };
};
const serializeVoteSession = (session, baseContext, viewerUserId) => {
    const votedUserIds = getParticipantIds(session.votes);
    const totalMembers = Math.max(1, baseContext.members.length);
    const requiredVotes = getRequiredVoteCount(totalMembers);
    const decisionMadeAt = session.decisionMadeAt instanceof Date
        ? session.decisionMadeAt.toISOString()
        : session.decisionMadeAt
            ? new Date(session.decisionMadeAt).toISOString()
            : null;
    const createdAt = session.createdAt instanceof Date ? session.createdAt.toISOString() : new Date(session.createdAt ?? Date.now()).toISOString();
    return {
        id: String(session._id),
        trip: {
            id: baseContext.tripId,
            title: baseContext.tripTitle,
            location: baseContext.tripLocation,
            imageUrl: baseContext.tripImageUrl,
        },
        placeName: typeof session.placeName === 'string' && session.placeName.trim() ? session.placeName.trim() : 'Suggested destination',
        description: typeof session.description === 'string' && session.description.trim()
            ? session.description.trim()
            : 'A collaborative pick for the trip.',
        estimatedCost: typeof session.estimatedCost === 'number' && Number.isFinite(session.estimatedCost)
            ? Number(session.estimatedCost.toFixed(2))
            : 0,
        imageUrl: typeof session.imageUrl === 'string' ? session.imageUrl.trim() : '',
        status: session.status,
        votedCount: votedUserIds.length,
        totalMembers,
        requiredVotes,
        majorityReached: votedUserIds.length >= requiredVotes,
        hasViewerVoted: votedUserIds.includes(viewerUserId),
        isViewerHost: viewerUserId === baseContext.organizerId,
        decisionMode: session.decisionMode ?? null,
        decisionMadeAt,
        createdAt,
        members: baseContext.members.map((member) => ({
            ...member,
            hasVoted: votedUserIds.includes(member.id),
        })),
    };
};
const buildVoteSessionPayload = async (tripId, voteId, viewerUserId) => {
    const [baseContext, voteSession] = await Promise.all([
        loadTripVoteBaseContext(tripId),
        Vote.findOne({ _id: new Types.ObjectId(voteId), tripId: new Types.ObjectId(tripId) })
            .select('_id placeName description estimatedCost imageUrl status votes decisionMode decisionMadeAt createdAt')
            .lean(),
    ]);
    if (!baseContext || !voteSession) {
        return null;
    }
    return serializeVoteSession(voteSession, baseContext, viewerUserId);
};
const writeVoteSessionStreamEvent = (response, payload) => {
    response.write('event: vote-session\n');
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
};
const removeVoteSessionStreamClient = (voteId, clientId) => {
    const voteClients = voteSessionStreams.get(voteId);
    const client = voteClients?.get(clientId);
    if (client) {
        clearInterval(client.heartbeatId);
    }
    voteClients?.delete(clientId);
    if (voteClients && voteClients.size === 0) {
        voteSessionStreams.delete(voteId);
    }
};
const broadcastVoteSession = async (tripId, voteId) => {
    const voteClients = voteSessionStreams.get(voteId);
    if (!voteClients || voteClients.size === 0) {
        return;
    }
    for (const [clientId, client] of voteClients.entries()) {
        try {
            const payload = await buildVoteSessionPayload(tripId, voteId, client.userId);
            if (!payload) {
                removeVoteSessionStreamClient(voteId, clientId);
                continue;
            }
            writeVoteSessionStreamEvent(client.response, payload);
        }
        catch {
            removeVoteSessionStreamClient(voteId, clientId);
        }
    }
};
const createTripVoteDecisionNotifications = async (baseContext, voteId, placeName) => {
    const notificationUserIds = baseContext.members
        .map((member) => member.id)
        .filter((memberId) => mongoose.isValidObjectId(memberId))
        .map((memberId) => new Types.ObjectId(memberId));
    if (!notificationUserIds.length) {
        return;
    }
    await Notification.insertMany(notificationUserIds.map((userId) => ({
        userId,
        type: 'trip_vote_decided',
        title: 'Decision Made',
        message: `${placeName} won the group vote for ${baseContext.tripTitle}.`,
        metadata: {
            tripId: baseContext.tripId,
            voteId,
            placeName,
        },
    })));
};
const decideVoteSession = async (tripId, voteId, decidingUserId, decisionMode) => {
    const baseContext = await loadTripVoteBaseContext(tripId);
    if (!baseContext) {
        return;
    }
    const otherOpenSessionIds = (await Vote.find({
        tripId: new Types.ObjectId(tripId),
        _id: { $ne: new Types.ObjectId(voteId) },
        status: 'open',
    })
        .select('_id')
        .lean()).map((session) => String(session._id));
    const decidedVote = await Vote.findOneAndUpdate({
        _id: new Types.ObjectId(voteId),
        tripId: new Types.ObjectId(tripId),
        status: 'open',
    }, {
        $set: {
            status: 'decided',
            decidedByUserId: new Types.ObjectId(decidingUserId),
            decisionMode,
            decisionMadeAt: new Date(),
            notificationSentAt: new Date(),
        },
    }, {
        new: true,
    })
        .select('_id placeName')
        .lean();
    if (!decidedVote) {
        return;
    }
    if (otherOpenSessionIds.length) {
        await Vote.updateMany({
            tripId: new Types.ObjectId(tripId),
            _id: { $in: otherOpenSessionIds.map((sessionId) => new Types.ObjectId(sessionId)) },
        }, {
            $set: {
                status: 'archived',
            },
        });
    }
    await createTripVoteDecisionNotifications(baseContext, String(decidedVote._id), typeof decidedVote.placeName === 'string' && decidedVote.placeName.trim()
        ? decidedVote.placeName.trim()
        : 'Your next stop');
    await broadcastVoteSession(tripId, voteId);
    await Promise.all(otherOpenSessionIds.map((sessionId) => broadcastVoteSession(tripId, sessionId)));
    await broadcastTripSuggestions(tripId);
};
const findCurrentActiveTripIdForUser = async (userId) => {
    const currentDayStart = toDayStart(new Date());
    const currentDayEnd = toDayEnd(new Date());
    if (!currentDayStart || !currentDayEnd) {
        return null;
    }
    const userObjectId = new Types.ObjectId(userId);
    const activeTrip = await Trip.findOne({
        status: { $nin: [...CANCELLED_TRIP_STATUS_VALUES, ...COMPLETED_TRIP_STATUS_VALUES] },
        $or: [{ organizerId: userObjectId }, { participants: userObjectId }],
        startDate: { $lte: currentDayEnd },
        endDate: { $gte: currentDayStart },
    })
        .sort({ startDate: -1, createdAt: -1 })
        .select('_id')
        .lean();
    return activeTrip ? String(activeTrip._id) : null;
};
const resolveTripForJoinRequest = async (tripId) => {
    const existingTrip = await Trip.findById(tripId)
        .select('_id organizerId maxParticipants participants startDate endDate status expectedBudget')
        .lean();
    if (existingTrip) {
        return { trip: existingTrip };
    }
    const post = await Post.findById(tripId)
        .select('_id title location imageUrl requiredPeople expectedBudget startDate endDate status authorKey hostName travelerType currency isPrivate emergencyContact')
        .lean();
    if (!post) {
        return { trip: null, message: 'Trip not found.' };
    }
    const rawAuthorKey = typeof post.authorKey === 'string' && post.authorKey.trim()
        ? post.authorKey
        : typeof post.hostName === 'string'
            ? post.hostName
            : '';
    const normalizedAuthorKey = rawAuthorKey ? normalizeAuthorKey(rawAuthorKey) : '';
    if (!normalizedAuthorKey) {
        return { trip: null, message: 'Trip host could not be resolved.' };
    }
    const hostUser = await User.findOne({
        $or: [{ email: normalizedAuthorKey }, { userId: normalizedAuthorKey }],
    })
        .select('_id')
        .lean();
    if (!hostUser?._id) {
        return { trip: null, message: 'Trip host account not found.' };
    }
    const fallbackStartDate = new Date();
    fallbackStartDate.setHours(0, 0, 0, 0);
    fallbackStartDate.setDate(fallbackStartDate.getDate() + 7);
    const startDate = parseTripDate(post.startDate, fallbackStartDate);
    const fallbackEndDate = new Date(startDate);
    fallbackEndDate.setDate(fallbackEndDate.getDate() + 6);
    const parsedEndDate = parseTripDate(post.endDate, fallbackEndDate);
    const endDate = parsedEndDate < startDate ? fallbackEndDate : parsedEndDate;
    const maxParticipants = Number.isInteger(post.requiredPeople) && post.requiredPeople > 0
        ? Math.min(post.requiredPeople, 100)
        : 4;
    const upsertedTrip = await Trip.findOneAndUpdate({ _id: new Types.ObjectId(tripId) }, {
        $setOnInsert: {
            organizerId: hostUser._id,
            title: typeof post.title === 'string' && post.title.trim()
                ? post.title.trim()
                : `Trip ${String(post._id).slice(-6)}`,
            location: typeof post.location === 'string' && post.location.trim()
                ? post.location.trim()
                : 'Custom route',
            imageUrl: typeof post.imageUrl === 'string' && post.imageUrl.trim()
                ? post.imageUrl.trim()
                : '',
            expectedBudget: typeof post.expectedBudget === 'number' && Number.isFinite(post.expectedBudget) && post.expectedBudget >= 1
                ? Number(post.expectedBudget.toFixed(2))
                : Math.max(1, maxParticipants) * Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1) * 100,
            travelerType: typeof post.travelerType === 'string' && post.travelerType.trim()
                ? post.travelerType.trim()
                : '',
            currency: typeof post.currency === 'string' && post.currency.trim()
                ? post.currency.trim().toUpperCase()
                : 'USD',
            isPrivate: Boolean(post.isPrivate),
            emergencyContact: {
                name: typeof post.emergencyContact?.name === 'string' && post.emergencyContact.name.trim()
                    ? post.emergencyContact.name.trim()
                    : 'Primary Emergency Contact',
                phone: typeof post.emergencyContact?.phone === 'string' && post.emergencyContact.phone.trim()
                    ? post.emergencyContact.phone.trim()
                    : 'Not provided',
            },
            startDate,
            endDate,
            status: getTripStatus(post.status, { startDate, endDate }),
            maxParticipants,
            participants: [],
        },
    }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
    })
        .select('_id organizerId maxParticipants participants startDate endDate status')
        .lean();
    return { trip: upsertedTrip };
};
router.get('/self', requireAuth, async (req, res) => {
    const authRequest = req;
    const userId = authRequest.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        await markPastTripsCompleted();
        const userObjectId = new Types.ObjectId(userId);
        const todayStart = toDayStart(new Date()) ?? new Date();
        const trips = await Trip.find({
            organizerId: userObjectId,
        })
            .sort({ startDate: 1 })
            .select('_id organizerId title location expectedBudget startDate endDate status maxParticipants participants createdAt updatedAt')
            .populate('organizerId', 'firstName lastName userId profileImageDataUrl')
            .populate('participants', 'firstName lastName userId profileImageDataUrl')
            .lean();
        if (trips.length === 0) {
            return res.status(200).json({ trips: [], upcomingTrips: [], pastTrips: [] });
        }
        const tripObjectIds = trips.map((trip) => new Types.ObjectId(String(trip._id)));
        const pendingCounts = await TripJoinRequest.aggregate([
            {
                $match: {
                    hostId: userObjectId,
                    status: 'pending',
                    tripId: { $in: tripObjectIds },
                },
            },
            {
                $group: {
                    _id: '$tripId',
                    pendingRequestCount: { $sum: 1 },
                },
            },
        ]);
        const pendingCountByTripId = pendingCounts.reduce((accumulator, currentValue) => {
            accumulator[String(currentValue._id)] = currentValue.pendingRequestCount;
            return accumulator;
        }, {});
        const tripSummaries = trips.map((trip) => {
            const tripId = String(trip._id);
            const participantIds = getParticipantIds(trip.participants);
            const spotsFilled = participantIds.length;
            const organizerId = getReferencedUserId(trip.organizerId);
            return {
                id: tripId,
                hostId: organizerId,
                owner: organizerId
                    ? {
                        id: organizerId,
                        name: getDisplayName(trip.organizerId),
                        profileImageDataUrl: getProfileImageDataUrl(trip.organizerId),
                    }
                    : null,
                members: Array.isArray(trip.participants)
                    ? trip.participants
                        .map((participant) => {
                        const memberId = getReferencedUserId(participant);
                        if (!memberId) {
                            return null;
                        }
                        return {
                            id: memberId,
                            name: getDisplayName(participant),
                            profileImageDataUrl: getProfileImageDataUrl(participant),
                        };
                    })
                        .filter((member) => Boolean(member))
                    : [],
                title: trip.title,
                location: trip.location,
                expectedBudget: typeof trip.expectedBudget === 'number' ? Number(trip.expectedBudget.toFixed(2)) : 0,
                startDate: trip.startDate,
                endDate: trip.endDate,
                status: getTripStatus(trip.status, trip),
                maxParticipants: trip.maxParticipants,
                spotsFilled,
                spotsFilledPercent: getSpotsFilledPercent(spotsFilled, trip.maxParticipants),
                participantIds,
                pendingRequestCount: organizerId === userId ? pendingCountByTripId[tripId] ?? 0 : 0,
                createdAt: trip.createdAt,
                updatedAt: trip.updatedAt,
            };
        });
        const upcomingTrips = tripSummaries.filter((trip) => {
            const tripEndDate = trip.endDate instanceof Date ? trip.endDate : new Date(trip.endDate);
            return !Number.isNaN(tripEndDate.getTime()) && tripEndDate >= todayStart;
        });
        const pastTrips = tripSummaries.filter((trip) => {
            const tripEndDate = trip.endDate instanceof Date ? trip.endDate : new Date(trip.endDate);
            return Number.isNaN(tripEndDate.getTime()) || tripEndDate < todayStart;
        });
        return res.status(200).json({
            trips: upcomingTrips,
            upcomingTrips,
            pastTrips,
        });
    }
    catch (error) {
        console.error('GET /api/trips/self failed', error);
        return res.status(500).json({ message: 'Unable to load your trips right now.' });
    }
});
router.get('/active/settlement', requireAuth, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const activeTripId = await findCurrentActiveTripIdForUser(requesterId);
        if (!activeTripId) {
            return res.status(404).json({ message: 'No active trip is available for expense splitting right now.' });
        }
        const settlement = await buildTripSettlement(activeTripId, requesterId);
        if ('error' in settlement) {
            return res.status(settlement.error.status).json({ message: settlement.error.message });
        }
        return res.status(200).json(settlement);
    }
    catch (error) {
        console.error('GET /api/trips/active/settlement failed', error);
        return res.status(500).json({ message: 'Unable to load your active trip settlement right now.' });
    }
});
router.get('/active', requireAuth, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const activeTripId = await findCurrentActiveTripIdForUser(requesterId);
        return res.status(200).json({ tripId: activeTripId });
    }
    catch (error) {
        console.error('GET /api/trips/active failed', error);
        return res.status(500).json({ message: 'Unable to load your active trip right now.' });
    }
});
router.get('/:tripId/settlement', requireAuth, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const settlement = await buildTripSettlement(tripId, requesterId);
        if ('error' in settlement) {
            return res.status(settlement.error.status).json({ message: settlement.error.message });
        }
        return res.status(200).json(settlement);
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/settlement failed', error);
        return res.status(500).json({ message: 'Unable to load trip settlement right now.' });
    }
});
router.get('/:tripId/suggestions', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const payload = await buildTripSuggestionsPayload(tripId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/suggestions failed', error);
        return res.status(500).json({ message: 'Unable to load AI trip suggestions right now.' });
    }
});
router.get('/:tripId/suggestions/stream', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const payload = await buildTripSuggestionsPayload(tripId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders?.();
        const clientId = nextTripSuggestionStreamId++;
        const heartbeatId = setInterval(() => {
            res.write('event: ping\n');
            res.write('data: {}\n\n');
        }, 15000);
        if (!tripSuggestionStreams.has(tripId)) {
            tripSuggestionStreams.set(tripId, new Map());
        }
        tripSuggestionStreams.get(tripId)?.set(clientId, {
            response: res,
            userId: requesterId,
            heartbeatId,
        });
        writeSuggestionStreamEvent(res, payload);
        req.on('close', () => {
            removeTripSuggestionStreamClient(tripId, clientId);
        });
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/suggestions/stream failed', error);
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Unable to open live voting updates right now.' });
        }
        res.end();
    }
});
router.post('/:tripId/generate-suggestions', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const userPreferences = req.body;
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const requestedCollectiveMood = normalizePreferenceValue(userPreferences.userPreferences?.collectiveMood, '');
        const requestedInterest = normalizePreferenceValue(userPreferences.userPreferences?.interest, '');
        const requestedBudget = normalizePreferenceValue(userPreferences.userPreferences?.budget, '');
        const requestedFood = normalizePreferenceValue(userPreferences.userPreferences?.food, '');
        const requestedCrowds = normalizePreferenceValue(userPreferences.userPreferences?.crowds, '');
        if ((!requestedCollectiveMood || !requestedInterest || !requestedBudget || !requestedFood || !requestedCrowds)) {
            const existingPayload = await buildTripSuggestionsPayload(tripId, requesterId);
            if (existingPayload && existingPayload.suggestions.length > 0) {
                return res.status(200).json(existingPayload);
            }
        }
        const context = await loadTripSuggestionContext(tripId);
        if (!context) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        const nextPreferences = {
            collectiveMood: normalizePreferenceValue(userPreferences.userPreferences?.collectiveMood, context.generatedPreferences?.collectiveMood || 'Peace & Zen'),
            interest: normalizePreferenceValue(userPreferences.userPreferences?.interest, context.generatedPreferences?.interest || 'Arts & Culture'),
            budget: normalizePreferenceValue(userPreferences.userPreferences?.budget, context.generatedPreferences?.budget || 'Balanced'),
            food: normalizePreferenceValue(userPreferences.userPreferences?.food, context.generatedPreferences?.food || 'Coffee & Cafes'),
            crowds: normalizePreferenceValue(userPreferences.userPreferences?.crowds, context.generatedPreferences?.crowds || 'Hidden Gems/Quiet'),
        };
        if (!requestedCollectiveMood &&
            !requestedInterest &&
            !requestedBudget &&
            !requestedFood &&
            !requestedCrowds &&
            context.suggestions.length > 0) {
            const existingPayload = await buildTripSuggestionsPayload(tripId, requesterId);
            if (existingPayload) {
                return res.status(200).json(existingPayload);
            }
        }
        const generatedSuggestions = await generateTripSuggestions({
            destination: context.destination,
            travelerType: context.travelerType,
            collectiveMood: nextPreferences.collectiveMood,
            interest: nextPreferences.interest,
            budget: nextPreferences.budget,
            food: nextPreferences.food,
            crowds: nextPreferences.crowds,
        });
        await Trip.updateOne({ _id: new Types.ObjectId(tripId) }, {
            $set: {
                travelerType: context.travelerType,
                suggestionPreferences: nextPreferences,
                suggestions: generatedSuggestions.map((suggestion) => ({
                    name: suggestion.name,
                    whyVisit: suggestion.whyVisit,
                    estimatedCostPerPerson: suggestion.estimatedCostPerPerson,
                    vibeMatchPercent: suggestion.vibeMatchPercent,
                    imageUrl: suggestion.imageUrl,
                    voteUserIds: [],
                    createdAt: new Date(),
                })),
                suggestionsGeneratedAt: new Date(),
            },
        });
        const payload = await buildTripSuggestionsPayload(tripId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        await broadcastTripSuggestions(tripId);
        return res.status(201).json(payload);
    }
    catch (error) {
        console.error('POST /api/trips/:tripId/generate-suggestions failed', error);
        const message = error instanceof Error ? error.message : 'Unable to generate AI suggestions right now.';
        const statusCode = message === 'Gemini API key is not configured.' ? 503 : 500;
        return res.status(statusCode).json({ message });
    }
});
router.post('/:tripId/suggestions/:suggestionId/vote', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const suggestionId = typeof req.params.suggestionId === 'string' ? req.params.suggestionId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!suggestionId || !mongoose.isValidObjectId(suggestionId)) {
        return res.status(400).json({ message: 'Suggestion id is invalid.' });
    }
    try {
        const userObjectId = new Types.ObjectId(requesterId);
        const matchingTrip = await Trip.findOne({
            _id: new Types.ObjectId(tripId),
            'suggestions._id': new Types.ObjectId(suggestionId),
        })
            .select('suggestions')
            .lean();
        if (!matchingTrip) {
            return res.status(404).json({ message: 'Suggestion not found for this trip.' });
        }
        const selectedSuggestion = (Array.isArray(matchingTrip.suggestions) ? matchingTrip.suggestions : []).find((suggestion) => String(suggestion._id) === suggestionId);
        const alreadyVoted = getParticipantIds(selectedSuggestion?.voteUserIds).includes(requesterId);
        await Trip.updateOne({ _id: new Types.ObjectId(tripId) }, {
            $pull: {
                'suggestions.$[].voteUserIds': userObjectId,
            },
        });
        if (!alreadyVoted) {
            await Trip.updateOne({
                _id: new Types.ObjectId(tripId),
                'suggestions._id': new Types.ObjectId(suggestionId),
            }, {
                $addToSet: {
                    'suggestions.$.voteUserIds': userObjectId,
                },
            });
        }
        const payload = await buildTripSuggestionsPayload(tripId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        await broadcastTripSuggestions(tripId);
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error('POST /api/trips/:tripId/suggestions/:suggestionId/vote failed', error);
        return res.status(500).json({ message: 'Unable to register this vote right now.' });
    }
});
router.post('/:tripId/votes', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const requestBody = req.body;
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const trip = await Trip.findById(tripId).select('_id organizerId suggestions').lean();
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        if (getReferencedUserId(trip.organizerId) !== requesterId) {
            return res.status(403).json({ message: 'Only the host can create a voting room.' });
        }
        const suggestionId = typeof requestBody.suggestionId === 'string' ? requestBody.suggestionId.trim() : '';
        if (!suggestionId) {
            return res.status(400).json({ message: 'Suggestion id is required.' });
        }
        const existingSession = await Vote.findOne({
            tripId: new Types.ObjectId(tripId),
            sourceSuggestionId: suggestionId,
            status: { $in: ['open', 'decided'] },
        })
            .sort({ updatedAt: -1, createdAt: -1 })
            .select('_id')
            .lean();
        if (existingSession) {
            const existingPayload = await buildVoteSessionPayload(tripId, String(existingSession._id), requesterId);
            if (existingPayload) {
                return res.status(200).json(existingPayload);
            }
        }
        const matchedSuggestion = (Array.isArray(trip.suggestions) ? trip.suggestions : []).find((suggestion) => String(suggestion._id) === suggestionId);
        const placeName = typeof matchedSuggestion?.name === 'string' && matchedSuggestion.name.trim()
            ? matchedSuggestion.name.trim()
            : normalizePreferenceValue(requestBody.placeName, '');
        const description = typeof matchedSuggestion?.whyVisit === 'string' && matchedSuggestion.whyVisit.trim()
            ? matchedSuggestion.whyVisit.trim()
            : normalizePreferenceValue(requestBody.description, '');
        const estimatedCost = typeof matchedSuggestion?.estimatedCostPerPerson === 'number' && Number.isFinite(matchedSuggestion.estimatedCostPerPerson)
            ? Number(matchedSuggestion.estimatedCostPerPerson.toFixed(2))
            : typeof requestBody.estimatedCost === 'number' && Number.isFinite(requestBody.estimatedCost) && requestBody.estimatedCost >= 0
                ? Number(requestBody.estimatedCost.toFixed(2))
                : 0;
        const imageUrl = typeof matchedSuggestion?.imageUrl === 'string' && matchedSuggestion.imageUrl.trim()
            ? matchedSuggestion.imageUrl.trim()
            : normalizePreferenceValue(requestBody.imageUrl, '');
        if (!placeName || !description) {
            return res.status(400).json({ message: 'Suggestion details are incomplete for this voting room.' });
        }
        const createdVote = await Vote.create({
            tripId: new Types.ObjectId(tripId),
            sourceSuggestionId: suggestionId,
            placeName,
            description,
            estimatedCost,
            imageUrl,
            votes: [],
            status: 'open',
            createdByUserId: new Types.ObjectId(requesterId),
        });
        const payload = await buildVoteSessionPayload(tripId, String(createdVote._id), requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Voting room could not be created.' });
        }
        await broadcastTripSuggestions(tripId);
        return res.status(201).json(payload);
    }
    catch (error) {
        console.error('POST /api/trips/:tripId/votes failed', error);
        return res.status(500).json({ message: 'Unable to create a voting room right now.' });
    }
});
router.get('/:tripId/votes/latest-decision', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const latestDecision = await Vote.findOne({
            tripId: new Types.ObjectId(tripId),
            status: 'decided',
        })
            .sort({ decisionMadeAt: -1, updatedAt: -1 })
            .select('_id')
            .lean();
        if (!latestDecision) {
            return res.status(200).json({ decision: null });
        }
        const payload = await buildVoteSessionPayload(tripId, String(latestDecision._id), requesterId);
        return res.status(200).json({
            decision: payload,
        });
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/votes/latest-decision failed', error);
        return res.status(500).json({ message: 'Unable to load the latest trip decision right now.' });
    }
});
router.get('/:tripId/votes/:voteId', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const voteId = typeof req.params.voteId === 'string' ? req.params.voteId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!voteId || !mongoose.isValidObjectId(voteId)) {
        return res.status(400).json({ message: 'Vote id is invalid.' });
    }
    try {
        const payload = await buildVoteSessionPayload(tripId, voteId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Voting room not found.' });
        }
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/votes/:voteId failed', error);
        return res.status(500).json({ message: 'Unable to load this voting room right now.' });
    }
});
router.get('/:tripId/votes/:voteId/stream', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const voteId = typeof req.params.voteId === 'string' ? req.params.voteId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!voteId || !mongoose.isValidObjectId(voteId)) {
        return res.status(400).json({ message: 'Vote id is invalid.' });
    }
    try {
        const payload = await buildVoteSessionPayload(tripId, voteId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Voting room not found.' });
        }
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders?.();
        const clientId = nextVoteSessionStreamId++;
        const heartbeatId = setInterval(() => {
            res.write('event: ping\n');
            res.write('data: {}\n\n');
        }, 15000);
        if (!voteSessionStreams.has(voteId)) {
            voteSessionStreams.set(voteId, new Map());
        }
        voteSessionStreams.get(voteId)?.set(clientId, {
            response: res,
            userId: requesterId,
            heartbeatId,
        });
        writeVoteSessionStreamEvent(res, payload);
        req.on('close', () => {
            removeVoteSessionStreamClient(voteId, clientId);
        });
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/votes/:voteId/stream failed', error);
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Unable to open this voting room stream right now.' });
        }
        res.end();
    }
});
router.post('/:tripId/votes/:voteId/cast', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const voteId = typeof req.params.voteId === 'string' ? req.params.voteId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!voteId || !mongoose.isValidObjectId(voteId)) {
        return res.status(400).json({ message: 'Vote id is invalid.' });
    }
    try {
        const updatedVote = await Vote.findOneAndUpdate({
            _id: new Types.ObjectId(voteId),
            tripId: new Types.ObjectId(tripId),
            status: 'open',
        }, {
            $addToSet: {
                votes: new Types.ObjectId(requesterId),
            },
        }, {
            new: true,
        })
            .select('_id votes status')
            .lean();
        if (!updatedVote) {
            const existingVote = await Vote.findOne({
                _id: new Types.ObjectId(voteId),
                tripId: new Types.ObjectId(tripId),
            })
                .select('_id status')
                .lean();
            if (!existingVote) {
                return res.status(404).json({ message: 'Voting room not found.' });
            }
            const payload = await buildVoteSessionPayload(tripId, voteId, requesterId);
            return res.status(409).json({
                message: existingVote.status === 'archived' ? 'This voting room has been archived.' : 'This voting room is already closed.',
                vote: payload,
            });
        }
        const baseContext = await loadTripVoteBaseContext(tripId);
        const requiredVotes = getRequiredVoteCount(baseContext?.members.length ?? 1);
        if (getParticipantIds(updatedVote.votes).length >= requiredVotes) {
            await decideVoteSession(tripId, voteId, requesterId, 'majority');
        }
        else {
            await Promise.all([broadcastVoteSession(tripId, voteId), broadcastTripSuggestions(tripId)]);
        }
        const payload = await buildVoteSessionPayload(tripId, voteId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Voting room not found.' });
        }
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error('POST /api/trips/:tripId/votes/:voteId/cast failed', error);
        return res.status(500).json({ message: 'Unable to submit your vote right now.' });
    }
});
router.post('/:tripId/votes/:voteId/close', requireAuth, verifyTripAccess, async (req, res) => {
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const voteId = typeof req.params.voteId === 'string' ? req.params.voteId : '';
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!voteId || !mongoose.isValidObjectId(voteId)) {
        return res.status(400).json({ message: 'Vote id is invalid.' });
    }
    try {
        const baseContext = await loadTripVoteBaseContext(tripId);
        if (!baseContext) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        if (baseContext.organizerId !== requesterId) {
            return res.status(403).json({ message: 'Only the host can close this voting room.' });
        }
        await decideVoteSession(tripId, voteId, requesterId, 'host_closed');
        const payload = await buildVoteSessionPayload(tripId, voteId, requesterId);
        if (!payload) {
            return res.status(404).json({ message: 'Voting room not found.' });
        }
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error('POST /api/trips/:tripId/votes/:voteId/close failed', error);
        return res.status(500).json({ message: 'Unable to close this voting room right now.' });
    }
});
router.get('/:tripId', async (req, res) => {
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    if (!tripId || !mongoose.isValidObjectId(tripId)) {
        return res.status(400).json({ message: 'Trip id is invalid.' });
    }
    try {
        await markPastTripsCompleted();
        const trip = await Trip.findById(tripId)
            .select('_id organizerId title location imageUrl expectedBudget travelerType currency isPrivate emergencyContact startDate endDate status maxParticipants participants createdAt updatedAt')
            .lean();
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        const participantIds = getParticipantIds(trip.participants);
        const spotsFilled = participantIds.length;
        return res.status(200).json({
            trip: {
                id: String(trip._id),
                hostId: String(trip.organizerId),
                title: trip.title,
                location: trip.location,
                imageUrl: typeof trip.imageUrl === 'string' ? trip.imageUrl : '',
                expectedBudget: typeof trip.expectedBudget === 'number' ? Number(trip.expectedBudget.toFixed(2)) : 0,
                travelerType: typeof trip.travelerType === 'string' ? trip.travelerType : '',
                currency: typeof trip.currency === 'string' ? trip.currency : 'USD',
                isPrivate: Boolean(trip.isPrivate),
                emergencyContact: {
                    name: typeof trip.emergencyContact?.name === 'string' && trip.emergencyContact.name.trim()
                        ? trip.emergencyContact.name.trim()
                        : '',
                    phone: typeof trip.emergencyContact?.phone === 'string' && trip.emergencyContact.phone.trim()
                        ? trip.emergencyContact.phone.trim()
                        : '',
                },
                startDate: trip.startDate,
                endDate: trip.endDate,
                status: getTripStatus(trip.status, trip),
                maxParticipants: trip.maxParticipants,
                spotsFilled,
                spotsFilledPercent: getSpotsFilledPercent(spotsFilled, trip.maxParticipants),
                participantIds,
                createdAt: trip.createdAt,
                updatedAt: trip.updatedAt,
            },
        });
    }
    catch (error) {
        console.error('GET /api/trips/:tripId failed', error);
        return res.status(500).json({ message: 'Unable to load trip details right now.' });
    }
});
router.get('/:tripId/requests', requireAuth, async (req, res) => {
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const authRequest = req;
    const hostId = authRequest.user?.id;
    const requestedStatus = req.query.status;
    if (!hostId || !mongoose.isValidObjectId(hostId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!tripId || !mongoose.isValidObjectId(tripId)) {
        return res.status(400).json({ message: 'Trip id is invalid.' });
    }
    const status = typeof requestedStatus === 'undefined'
        ? 'pending'
        : isRequestStatus(requestedStatus)
            ? requestedStatus
            : null;
    if (!status) {
        return res.status(400).json({ message: 'Invalid status filter.' });
    }
    try {
        await markPastTripsCompleted();
        const hostObjectId = new Types.ObjectId(hostId);
        const tripObjectId = new Types.ObjectId(tripId);
        const hostTrip = await Trip.findOne({
            _id: tripObjectId,
            organizerId: hostObjectId,
        })
            .select('_id')
            .lean();
        if (!hostTrip) {
            return res.status(404).json({ message: 'Trip not found for this host.' });
        }
        const requests = await TripJoinRequest.find({
            tripId: tripObjectId,
            hostId: hostObjectId,
            status,
        })
            .sort({ createdAt: -1 })
            .select('_id tripId requesterId status createdAt')
            .lean();
        return res.status(200).json({
            requests: requests.map((request) => {
                const requesterId = String(request.requesterId);
                return {
                    id: String(request._id),
                    tripId: String(request.tripId),
                    requesterId,
                    requesterLabel: `Traveler ${requesterId.slice(-6)}`,
                    status: request.status,
                    createdAt: request.createdAt,
                };
            }),
        });
    }
    catch (error) {
        console.error('GET /api/trips/:tripId/requests failed', error);
        return res.status(500).json({ message: 'Unable to load trip requests right now.' });
    }
});
router.post('/:tripId/join', requireAuth, async (req, res) => {
    const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
    const authRequest = req;
    const requesterId = authRequest.user?.id;
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!tripId || !mongoose.isValidObjectId(tripId)) {
        return res.status(400).json({ message: 'Trip id is invalid.' });
    }
    try {
        await markPastTripsCompleted();
        const resolvedTrip = await resolveTripForJoinRequest(tripId);
        if (!resolvedTrip.trip) {
            return res.status(404).json({ message: resolvedTrip.message ?? 'Trip not found.' });
        }
        const trip = resolvedTrip.trip;
        const participantIds = getParticipantIds(trip.participants);
        const tripStatus = getTripStatus(trip.status, trip);
        const requesterObjectId = new Types.ObjectId(requesterId);
        const hostObjectId = new Types.ObjectId(String(trip.organizerId));
        if (hostObjectId.equals(requesterObjectId)) {
            return res.status(400).json({ message: 'Host cannot send a join request for their own trip.' });
        }
        if (tripStatus === CANCELLED_TRIP_STATUS) {
            return res.status(409).json({ message: 'Trip is cancelled and can no longer accept join requests.' });
        }
        if (tripStatus === COMPLETED_TRIP_STATUS) {
            return res.status(409).json({ message: 'Trip is already completed and can no longer accept join requests.' });
        }
        if (participantIds.includes(requesterId)) {
            return res.status(409).json({ message: 'You are already a participant in this trip.' });
        }
        const overlappingTrip = await findTripOverlap({
            userId: requesterObjectId,
            startDate: trip.startDate,
            endDate: trip.endDate,
            excludeTripId: trip._id,
        });
        if (overlappingTrip) {
            return res.status(400).json({ message: TRIP_OVERLAP_ERROR_MESSAGE });
        }
        if (participantIds.length >= trip.maxParticipants) {
            return res.status(409).json({ message: 'Trip has reached the maximum participant limit.' });
        }
        const existingParticipant = await Participant.findOne({
            tripId: new Types.ObjectId(tripId),
            userId: requesterObjectId,
        })
            .select('_id')
            .lean();
        if (existingParticipant) {
            await Trip.updateOne({ _id: new Types.ObjectId(tripId) }, { $addToSet: { participants: requesterObjectId } });
            return res.status(409).json({ message: 'You are already a participant in this trip.' });
        }
        const existingRequest = await TripJoinRequest.findOne({
            tripId: new Types.ObjectId(tripId),
            requesterId: requesterObjectId,
        })
            .select('_id status')
            .lean();
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(409).json({ message: 'Join request already pending.' });
            }
            if (existingRequest.status === 'accepted') {
                return res.status(409).json({ message: 'Join request already accepted.' });
            }
            return res.status(409).json({ message: 'Join request already rejected.' });
        }
        const joinRequest = await TripJoinRequest.create({
            tripId: new Types.ObjectId(tripId),
            requesterId: requesterObjectId,
            hostId: hostObjectId,
            status: 'pending',
        });
        return res.status(201).json({
            message: 'Join request submitted.',
            request: {
                id: joinRequest._id.toString(),
                tripId: joinRequest.tripId.toString(),
                requesterId: joinRequest.requesterId.toString(),
                hostId: joinRequest.hostId.toString(),
                status: joinRequest.status,
                createdAt: joinRequest.createdAt,
            },
        });
    }
    catch (error) {
        console.error('POST /api/trips/:tripId/join failed', error);
        return res.status(500).json({ message: 'Unable to create join request right now.' });
    }
});
router.patch('/:requestId/status', requireAuth, async (req, res) => {
    const requestId = req.params.requestId;
    const authRequest = req;
    const userId = authRequest.user?.id;
    const { status } = req.body;
    if (!requestId || !mongoose.isValidObjectId(requestId)) {
        return res.status(400).json({ message: 'Invalid request id.' });
    }
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    if (!isRequestStatus(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }
    try {
        const request = await TripJoinRequest.findById(requestId)
            .select('tripId hostId requesterId status')
            .lean();
        if (!request) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        if (String(request.hostId) !== userId) {
            return res.status(403).json({ message: 'Only the host can update request status.' });
        }
        if (status === 'accepted') {
            const trip = await Trip.findById(request.tripId).select('_id startDate endDate status participants maxParticipants').lean();
            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }
            const tripStatus = getTripStatus(trip.status, trip);
            if (tripStatus === CANCELLED_TRIP_STATUS) {
                return res.status(409).json({ message: 'Trip is cancelled and cannot accept join requests.' });
            }
            if (tripStatus === COMPLETED_TRIP_STATUS) {
                return res.status(409).json({ message: 'Trip is already completed and cannot accept join requests.' });
            }
            const overlappingTrip = await findTripOverlap({
                userId: request.requesterId,
                startDate: trip.startDate,
                endDate: trip.endDate,
                excludeTripId: trip._id,
            });
            if (overlappingTrip) {
                return res.status(400).json({ message: TRIP_OVERLAP_ERROR_MESSAGE });
            }
            const participantIds = getParticipantIds(trip.participants);
            if (!participantIds.includes(String(request.requesterId)) && participantIds.length >= trip.maxParticipants) {
                return res.status(409).json({ message: 'Trip has reached the maximum participant limit.' });
            }
            await Trip.updateOne({ _id: request.tripId }, { $addToSet: { participants: request.requesterId } });
        }
        await TripJoinRequest.findByIdAndUpdate(requestId, { status });
        if (status === 'accepted') {
            await Participant.updateOne({
                tripId: request.tripId,
                userId: request.requesterId,
            }, {
                $setOnInsert: { role: 'participant' },
            }, { upsert: true });
        }
        return res.status(200).json({ message: 'Request status updated.' });
    }
    catch (error) {
        console.error('PATCH /api/trips/:requestId/status failed', error);
        return res.status(500).json({ message: 'Unable to update request status.' });
    }
});
export default router;
