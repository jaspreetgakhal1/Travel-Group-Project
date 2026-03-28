import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
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
} from '../utils/tripScheduling.js';
import { markPastTripsCompleted } from '../utils/expireTrips.js';
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

const resolveTripForJoinRequest = async (
  tripId: string,
): Promise<{
  trip: {
    _id: unknown;
    organizerId: unknown;
    maxParticipants: number;
    participants: unknown[];
    startDate: Date;
    endDate: Date;
    status?: string;
  } | null;
  message?: string;
}> => {
  const existingTrip = await Trip.findById(tripId)
    .select('_id organizerId maxParticipants participants startDate endDate status')
    .lean();
  if (existingTrip) {
    return { trip: existingTrip };
  }

  const post = await Post.findById(tripId)
    .select('_id title location requiredPeople startDate endDate status authorKey hostName')
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
      .select('_id organizerId title location startDate endDate status maxParticipants participants createdAt updatedAt')
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

router.get('/:tripId', async (req, res) => {
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';

  if (!tripId || !mongoose.isValidObjectId(tripId)) {
    return res.status(400).json({ message: 'Trip id is invalid.' });
  }

  try {
    await markPastTripsCompleted();
    const trip = await Trip.findById(tripId)
      .select('_id organizerId title location startDate endDate status maxParticipants participants createdAt updatedAt')
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
