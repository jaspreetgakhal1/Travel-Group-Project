import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyTripAccess } from '../middleware/verifyTripAccess.js';
import { Participant } from '../models/Participant.js';
import { Post } from '../models/Post.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
import { User } from '../models/User.js';
import {
  ACTIVE_TRIP_STATUS,
  CANCELLED_TRIP_STATUS,
  COMPLETED_TRIP_STATUS,
  TRIP_OVERLAP_ERROR_MESSAGE,
  findTripOverlap,
  toDayEnd,
  toDayStart,
} from '../utils/tripScheduling.js';
import { markPastTripsCompleted } from '../utils/expireTrips.js';
import { generateTripSuggestions } from '../utils/geminiTripSuggestions.js';
import { buildTripSettlement } from '../utils/wallet.js';
import type { AuthenticatedUser } from '../types/auth.js';

const router = express.Router();
const REQUEST_STATUSES = ['pending', 'accepted', 'rejected'] as const;
type RequestStatus = (typeof REQUEST_STATUSES)[number];
const isRequestStatus = (value: unknown): value is RequestStatus =>
  typeof value === 'string' && REQUEST_STATUSES.includes(value as RequestStatus);
const normalizeAuthorKey = (value: string): string => value.trim().toLowerCase();
const getParticipantIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((participantId) => String(participantId)) : [];
const getUniqueTripMemberIds = (organizerId: unknown, participants: unknown): string[] =>
  Array.from(new Set([String(organizerId), ...getParticipantIds(participants)].filter(Boolean)));
const getSpotsFilledPercent = (spotsFilled: number, maxParticipants: number): number => {
  if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((spotsFilled / maxParticipants) * 100));
};

const parseTripDate = (value: unknown, fallbackDate: Date): Date => {
  const parsedDate = value instanceof Date ? value : new Date(value as string | number | Date);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date(fallbackDate);
  }

  return parsedDate;
};

const getTripStatus = (value: unknown): string => {
  if (value === COMPLETED_TRIP_STATUS) {
    return COMPLETED_TRIP_STATUS;
  }

  if (value === CANCELLED_TRIP_STATUS) {
    return CANCELLED_TRIP_STATUS;
  }

  return ACTIVE_TRIP_STATUS;
};

type TripSuggestionContext = {
  tripId: string;
  title: string;
  destination: string;
  travelerType: string;
  totalTravelers: number;
  generatedPreferences: {
    collectiveMood: string;
    interest: string;
    budget: string;
    food: string;
    crowds: string;
  } | null;
  generatedAt: string | null;
  suggestions: Array<{
    id: string;
    name: string;
    whyVisit: string;
    estimatedCostPerPerson: number;
    vibeMatchPercent: number;
    imageUrl: string;
    voteUserIds: string[];
  }>;
};

type TripSuggestionsPayload = {
  tripId: string;
  title: string;
  destination: string;
  travelerType: string;
  totalTravelers: number;
  generatedPreferences: {
    collectiveMood: string;
    interest: string;
    budget: string;
    food: string;
    crowds: string;
  } | null;
  generatedAt: string | null;
  suggestions: Array<{
    id: string;
    name: string;
    whyVisit: string;
    estimatedCostPerPerson: number;
    vibeMatchPercent: number;
    imageUrl: string;
    voteCount: number;
    votePercent: number;
    hasVoted: boolean;
    isLeader: boolean;
    isWinningSuggestion: boolean;
  }>;
};

type TripSuggestionStreamClient = {
  response: express.Response;
  userId: string;
  heartbeatId: ReturnType<typeof setInterval>;
};

const tripSuggestionStreams = new Map<string, Map<number, TripSuggestionStreamClient>>();
let nextTripSuggestionStreamId = 1;

const getSuggestionTravelerTypeFallback = (category: unknown): string => {
  if (typeof category === 'string' && category.trim()) {
    return `${category.trim()} travelers`;
  }

  return 'collaborative travelers';
};

const normalizePreferenceValue = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const normalizeStoredSuggestionPreferences = (
  value: unknown,
): {
  collectiveMood: string;
  interest: string;
  budget: string;
  food: string;
  crowds: string;
} | null => {
  const preferenceValue = value as {
    collectiveMood?: unknown;
    interest?: unknown;
    budget?: unknown;
    food?: unknown;
    crowds?: unknown;
  } | null;

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

const writeSuggestionStreamEvent = (response: express.Response, payload: TripSuggestionsPayload): void => {
  response.write('event: suggestions\n');
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const removeTripSuggestionStreamClient = (tripId: string, clientId: number): void => {
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

const loadTripSuggestionContext = async (tripId: string): Promise<TripSuggestionContext | null> => {
  const trip = await Trip.findById(tripId)
    .select('_id title location travelerType category organizerId participants suggestions suggestionPreferences suggestionsGeneratedAt')
    .lean();

  if (!trip) {
    return null;
  }

  let travelerType =
    typeof trip.travelerType === 'string' && trip.travelerType.trim() ? trip.travelerType.trim() : '';

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
    generatedAt:
      trip.suggestionsGeneratedAt instanceof Date
        ? trip.suggestionsGeneratedAt.toISOString()
        : trip.suggestionsGeneratedAt
          ? new Date(trip.suggestionsGeneratedAt).toISOString()
          : null,
    suggestions: (Array.isArray(trip.suggestions) ? trip.suggestions : []).map((suggestion) => ({
      id: String(suggestion._id),
      name: typeof suggestion.name === 'string' ? suggestion.name.trim() : 'Suggested stop',
      whyVisit:
        typeof suggestion.whyVisit === 'string' && suggestion.whyVisit.trim()
          ? suggestion.whyVisit.trim()
          : 'A strong fit for this group trip.',
      estimatedCostPerPerson:
        typeof suggestion.estimatedCostPerPerson === 'number' && Number.isFinite(suggestion.estimatedCostPerPerson)
          ? Number(suggestion.estimatedCostPerPerson.toFixed(2))
          : 0,
      vibeMatchPercent:
        typeof suggestion.vibeMatchPercent === 'number' && Number.isFinite(suggestion.vibeMatchPercent)
          ? Math.max(0, Math.min(100, Math.round(suggestion.vibeMatchPercent)))
          : 0,
      imageUrl:
        typeof suggestion.imageUrl === 'string' && suggestion.imageUrl.trim() ? suggestion.imageUrl.trim() : '',
      voteUserIds: getParticipantIds(suggestion.voteUserIds),
    })),
  };
};

const serializeTripSuggestions = (
  context: TripSuggestionContext,
  viewerUserId: string,
): TripSuggestionsPayload => {
  const highestVoteCount = context.suggestions.reduce(
    (currentHighest, suggestion) => Math.max(currentHighest, suggestion.voteUserIds.length),
    0,
  );
  const leaderSuggestionIds =
    highestVoteCount > 0
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
        votePercent:
          context.totalTravelers > 0 ? Number(((voteCount / context.totalTravelers) * 100).toFixed(2)) : 0,
        hasVoted: suggestion.voteUserIds.includes(viewerUserId),
        isLeader: leaderSuggestionIds.includes(suggestion.id),
        isWinningSuggestion: winningSuggestionId === suggestion.id,
      };
    }),
  };
};

const buildTripSuggestionsPayload = async (
  tripId: string,
  viewerUserId: string,
): Promise<TripSuggestionsPayload | null> => {
  const context = await loadTripSuggestionContext(tripId);
  if (!context) {
    return null;
  }

  return serializeTripSuggestions(context, viewerUserId);
};

const broadcastTripSuggestions = async (tripId: string): Promise<void> => {
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

  for (const [clientId, client] of tripClients.entries()) {
    try {
      writeSuggestionStreamEvent(client.response, serializeTripSuggestions(context, client.userId));
    } catch {
      removeTripSuggestionStreamClient(tripId, clientId);
    }
  }
};

const findCurrentActiveTripIdForUser = async (userId: string): Promise<string | null> => {
  const currentDayStart = toDayStart(new Date());
  const currentDayEnd = toDayEnd(new Date());

  if (!currentDayStart || !currentDayEnd) {
    return null;
  }

  const userObjectId = new Types.ObjectId(userId);
  const activeTrip = await Trip.findOne({
    status: { $ne: CANCELLED_TRIP_STATUS },
    $or: [{ organizerId: userObjectId }, { participants: userObjectId }],
    startDate: { $lte: currentDayEnd },
    endDate: { $gte: currentDayStart },
  })
    .sort({ startDate: -1, createdAt: -1 })
    .select('_id')
    .lean();

  return activeTrip ? String(activeTrip._id) : null;
};

const resolveTripForJoinRequest = async (
  tripId: string,
): Promise<{
  trip: {
    _id: unknown;
    organizerId: unknown;
    maxParticipants: number;
    participants: unknown[];
    expectedBudget?: number;
    startDate: Date;
    endDate: Date;
    status?: string;
  } | null;
  message?: string;
}> => {
  const existingTrip = await Trip.findById(tripId)
    .select('_id organizerId maxParticipants participants startDate endDate status expectedBudget')
    .lean();
  if (existingTrip) {
    return { trip: existingTrip };
  }

  const post = await Post.findById(tripId)
    .select('_id title location imageUrl requiredPeople expectedBudget startDate endDate status authorKey hostName travelerType')
    .lean();

  if (!post) {
    return { trip: null, message: 'Trip not found.' };
  }

  const rawAuthorKey =
    typeof post.authorKey === 'string' && post.authorKey.trim()
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
  const maxParticipants =
    Number.isInteger(post.requiredPeople) && post.requiredPeople > 0
      ? Math.min(post.requiredPeople, 100)
      : 4;

  const upsertedTrip = await Trip.findOneAndUpdate(
    { _id: new Types.ObjectId(tripId) },
    {
      $setOnInsert: {
        organizerId: hostUser._id,
        title:
          typeof post.title === 'string' && post.title.trim()
            ? post.title.trim()
            : `Trip ${String(post._id).slice(-6)}`,
        location:
          typeof post.location === 'string' && post.location.trim()
            ? post.location.trim()
            : 'Custom route',
        imageUrl:
          typeof post.imageUrl === 'string' && post.imageUrl.trim()
            ? post.imageUrl.trim()
            : '',
        expectedBudget:
          typeof post.expectedBudget === 'number' && Number.isFinite(post.expectedBudget) && post.expectedBudget >= 0
            ? Number(post.expectedBudget.toFixed(2))
            : Math.max(1, maxParticipants) * Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1) * 100,
        travelerType:
          typeof post.travelerType === 'string' && post.travelerType.trim()
            ? post.travelerType.trim()
            : '',
        startDate,
        endDate,
        status: getTripStatus(post.status),
        maxParticipants,
        participants: [],
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  )
    .select('_id organizerId maxParticipants participants startDate endDate status')
    .lean();

  return { trip: upsertedTrip };
};

router.get('/self', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const hostId = authRequest.user?.id;

  if (!hostId || !mongoose.isValidObjectId(hostId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  try {
    await markPastTripsCompleted();
    const hostObjectId = new Types.ObjectId(hostId);
    const trips = await Trip.find({
      organizerId: hostObjectId,
    })
      .sort({ createdAt: -1 })
      .select('_id organizerId title location expectedBudget startDate endDate status maxParticipants participants createdAt updatedAt')
      .lean();

    if (trips.length === 0) {
      return res.status(200).json({ trips: [] });
    }

    const tripObjectIds = trips.map((trip) => new Types.ObjectId(String(trip._id)));
    const pendingCounts = await TripJoinRequest.aggregate<{ _id: Types.ObjectId; pendingRequestCount: number }>([
      {
        $match: {
          hostId: hostObjectId,
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

    const pendingCountByTripId = pendingCounts.reduce<Record<string, number>>((accumulator, currentValue) => {
      accumulator[String(currentValue._id)] = currentValue.pendingRequestCount;
      return accumulator;
    }, {});

    return res.status(200).json({
      trips: trips.map((trip) => {
        const tripId = String(trip._id);
        const participantIds = getParticipantIds(trip.participants);
        const spotsFilled = participantIds.length;
        return {
          id: tripId,
          hostId: String(trip.organizerId),
          title: trip.title,
          location: trip.location,
          expectedBudget: typeof trip.expectedBudget === 'number' ? Number(trip.expectedBudget.toFixed(2)) : 0,
          startDate: trip.startDate,
          endDate: trip.endDate,
          status: getTripStatus(trip.status),
          maxParticipants: trip.maxParticipants,
          spotsFilled,
          spotsFilledPercent: getSpotsFilledPercent(spotsFilled, trip.maxParticipants),
          participantIds,
          pendingRequestCount: pendingCountByTripId[tripId] ?? 0,
          createdAt: trip.createdAt,
          updatedAt: trip.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error('GET /api/trips/self failed', error);
    return res.status(500).json({ message: 'Unable to load your trips right now.' });
  }
});

router.get('/active/settlement', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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
  } catch (error) {
    console.error('GET /api/trips/active/settlement failed', error);
    return res.status(500).json({ message: 'Unable to load your active trip settlement right now.' });
  }
});

router.get('/:tripId/settlement', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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
  } catch (error) {
    console.error('GET /api/trips/:tripId/settlement failed', error);
    return res.status(500).json({ message: 'Unable to load trip settlement right now.' });
  }
});

router.get('/:tripId/suggestions', requireAuth, verifyTripAccess, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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
  } catch (error) {
    console.error('GET /api/trips/:tripId/suggestions failed', error);
    return res.status(500).json({ message: 'Unable to load AI trip suggestions right now.' });
  }
});

router.get('/:tripId/suggestions/stream', requireAuth, verifyTripAccess, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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
  } catch (error) {
    console.error('GET /api/trips/:tripId/suggestions/stream failed', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Unable to open live voting updates right now.' });
    }

    res.end();
  }
});

router.post('/:tripId/generate-suggestions', requireAuth, verifyTripAccess, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const requesterId = authRequest.user?.id;
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
  const userPreferences = req.body as {
    userPreferences?: {
      collectiveMood?: unknown;
      interest?: unknown;
      budget?: unknown;
      food?: unknown;
      crowds?: unknown;
    };
  };

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
      collectiveMood: normalizePreferenceValue(
        userPreferences.userPreferences?.collectiveMood,
        context.generatedPreferences?.collectiveMood || 'Peace & Zen',
      ),
      interest: normalizePreferenceValue(
        userPreferences.userPreferences?.interest,
        context.generatedPreferences?.interest || 'Arts & Culture',
      ),
      budget: normalizePreferenceValue(
        userPreferences.userPreferences?.budget,
        context.generatedPreferences?.budget || 'Balanced',
      ),
      food: normalizePreferenceValue(
        userPreferences.userPreferences?.food,
        context.generatedPreferences?.food || 'Coffee & Cafes',
      ),
      crowds: normalizePreferenceValue(
        userPreferences.userPreferences?.crowds,
        context.generatedPreferences?.crowds || 'Hidden Gems/Quiet',
      ),
    };

    if (
      !requestedCollectiveMood &&
      !requestedInterest &&
      !requestedBudget &&
      !requestedFood &&
      !requestedCrowds &&
      context.suggestions.length > 0
    ) {
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

    await Trip.updateOne(
      { _id: new Types.ObjectId(tripId) },
      {
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
      },
    );

    const payload = await buildTripSuggestionsPayload(tripId, requesterId);
    if (!payload) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    await broadcastTripSuggestions(tripId);
    return res.status(201).json(payload);
  } catch (error) {
    console.error('POST /api/trips/:tripId/generate-suggestions failed', error);
    const message = error instanceof Error ? error.message : 'Unable to generate AI suggestions right now.';
    const statusCode = message === 'Gemini API key is not configured.' ? 503 : 500;
    return res.status(statusCode).json({ message });
  }
});

router.post('/:tripId/suggestions/:suggestionId/vote', requireAuth, verifyTripAccess, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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

    const selectedSuggestion = (Array.isArray(matchingTrip.suggestions) ? matchingTrip.suggestions : []).find(
      (suggestion) => String(suggestion._id) === suggestionId,
    );
    const alreadyVoted = getParticipantIds(selectedSuggestion?.voteUserIds).includes(requesterId);

    await Trip.updateOne(
      { _id: new Types.ObjectId(tripId) },
      {
        $pull: {
          'suggestions.$[].voteUserIds': userObjectId,
        },
      },
    );

    if (!alreadyVoted) {
      await Trip.updateOne(
        {
          _id: new Types.ObjectId(tripId),
          'suggestions._id': new Types.ObjectId(suggestionId),
        },
        {
          $addToSet: {
            'suggestions.$.voteUserIds': userObjectId,
          },
        },
      );
    }

    const payload = await buildTripSuggestionsPayload(tripId, requesterId);
    if (!payload) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    await broadcastTripSuggestions(tripId);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('POST /api/trips/:tripId/suggestions/:suggestionId/vote failed', error);
    return res.status(500).json({ message: 'Unable to register this vote right now.' });
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
      .select('_id organizerId title location expectedBudget startDate endDate status maxParticipants participants createdAt updatedAt')
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
        expectedBudget: typeof trip.expectedBudget === 'number' ? Number(trip.expectedBudget.toFixed(2)) : 0,
        startDate: trip.startDate,
        endDate: trip.endDate,
        status: getTripStatus(trip.status),
        maxParticipants: trip.maxParticipants,
        spotsFilled,
        spotsFilledPercent: getSpotsFilledPercent(spotsFilled, trip.maxParticipants),
        participantIds,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/trips/:tripId failed', error);
    return res.status(500).json({ message: 'Unable to load trip details right now.' });
  }
});

router.get('/:tripId/requests', requireAuth, async (req, res) => {
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const hostId = authRequest.user?.id;
  const requestedStatus = req.query.status;

  if (!hostId || !mongoose.isValidObjectId(hostId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  if (!tripId || !mongoose.isValidObjectId(tripId)) {
    return res.status(400).json({ message: 'Trip id is invalid.' });
  }

  const status =
    typeof requestedStatus === 'undefined'
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
  } catch (error) {
    console.error('GET /api/trips/:tripId/requests failed', error);
    return res.status(500).json({ message: 'Unable to load trip requests right now.' });
  }
});

router.post('/:tripId/join', requireAuth, async (req, res) => {
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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
    const tripStatus = getTripStatus(trip.status);

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
      await Trip.updateOne(
        { _id: new Types.ObjectId(tripId) },
        { $addToSet: { participants: requesterObjectId } },
      );
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
  } catch (error) {
    console.error('POST /api/trips/:tripId/join failed', error);
    return res.status(500).json({ message: 'Unable to create join request right now.' });
  }
});

router.patch('/:requestId/status', requireAuth, async (req, res) => {
  const requestId = req.params.requestId;
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
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

      const tripStatus = getTripStatus(trip.status);
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

      await Trip.updateOne(
        { _id: request.tripId },
        { $addToSet: { participants: request.requesterId } },
      );
    }

    await TripJoinRequest.findByIdAndUpdate(requestId, { status });

    if (status === 'accepted') {
      await Participant.updateOne(
        {
          tripId: request.tripId,
          userId: request.requesterId,
        },
        {
          $setOnInsert: { role: 'participant' },
        },
        { upsert: true },
      );
    }

    return res.status(200).json({ message: 'Request status updated.' });
  } catch (error) {
    console.error('PATCH /api/trips/:requestId/status failed', error);
    return res.status(500).json({ message: 'Unable to update request status.' });
  }
});

export default router;
