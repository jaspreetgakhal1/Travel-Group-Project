import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Participant } from '../models/Participant.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest, type TripJoinRequestStatus } from '../models/TripJoinRequest.js';
import {
  ACTIVE_TRIP_STATUS,
  CANCELLED_TRIP_STATUS,
  COMPLETED_TRIP_STATUS,
  TRIP_OVERLAP_ERROR_MESSAGE,
  findTripOverlap,
} from '../utils/tripScheduling.js';
import type { AuthenticatedUser } from '../types/auth.js';

const router = express.Router();
const UPDATE_STATUSES: TripJoinRequestStatus[] = ['accepted', 'rejected'];

const isValidUpdateStatus = (status: unknown): status is (typeof UPDATE_STATUSES)[number] =>
  typeof status === 'string' && UPDATE_STATUSES.includes(status as (typeof UPDATE_STATUSES)[number]);

const toParticipantIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((participantId) => String(participantId)) : [];

const toSpotsFilledPercent = (spotsFilled: number, maxParticipants: number): number => {
  if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((spotsFilled / maxParticipants) * 100));
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

router.patch('/:requestId', requireAuth, async (req, res) => {
  const requestId = typeof req.params.requestId === 'string' ? req.params.requestId : '';
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const hostId = authRequest.user?.id;
  const status = req.body?.status;

  if (!hostId || !mongoose.isValidObjectId(hostId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({ message: 'Join request id is invalid.' });
  }

  if (!isValidUpdateStatus(status)) {
    return res.status(400).json({ message: 'Status must be accepted or rejected.' });
  }

  const hostObjectId = new Types.ObjectId(hostId);

  try {
    if (status === 'rejected') {
      const rejectedRequest = await TripJoinRequest.findOneAndUpdate(
        {
          _id: new Types.ObjectId(requestId),
          hostId: hostObjectId,
          status: 'pending',
        },
        {
          $set: { status: 'rejected' },
        },
        {
          new: true,
        },
      );

      if (!rejectedRequest) {
        const existingRequest = await TripJoinRequest.findById(requestId).select('_id hostId status');
        if (!existingRequest) {
          return res.status(404).json({ message: 'Join request not found.' });
        }

        if (!existingRequest.hostId.equals(hostObjectId)) {
          return res.status(403).json({ message: 'Only the trip host can update this request.' });
        }

        return res.status(409).json({ message: `Request already ${existingRequest.status}.` });
      }

      return res.status(200).json({
        message: 'Join request rejected.',
        request: {
          id: rejectedRequest._id.toString(),
          tripId: rejectedRequest.tripId.toString(),
          requesterId: rejectedRequest.requesterId.toString(),
          hostId: rejectedRequest.hostId.toString(),
          status: rejectedRequest.status,
          updatedAt: rejectedRequest.updatedAt,
        },
      });
    }

    const joinRequest = await TripJoinRequest.findById(requestId).select('_id tripId requesterId hostId status');
    if (!joinRequest) {
      return res.status(404).json({ message: 'Join request not found.' });
    }

    if (!joinRequest.hostId.equals(hostObjectId)) {
      return res.status(403).json({ message: 'Only the trip host can update this request.' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(409).json({ message: `Request already ${joinRequest.status}.` });
    }

    const requesterObjectId = new Types.ObjectId(String(joinRequest.requesterId));

    const targetTrip = await Trip.findById(joinRequest.tripId)
      .select('_id organizerId maxParticipants participants startDate endDate status');
    if (!targetTrip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const tripStatus = getTripStatus(targetTrip.status);
    if (tripStatus === CANCELLED_TRIP_STATUS) {
      return res.status(409).json({ message: 'Trip is cancelled and cannot accept join requests.' });
    }

    if (tripStatus === COMPLETED_TRIP_STATUS) {
      return res.status(409).json({ message: 'Trip is already completed and cannot accept join requests.' });
    }

    const overlappingTrip = await findTripOverlap({
      userId: requesterObjectId,
      startDate: targetTrip.startDate,
      endDate: targetTrip.endDate,
      excludeTripId: targetTrip._id,
    });
    if (overlappingTrip) {
      return res.status(400).json({ message: TRIP_OVERLAP_ERROR_MESSAGE });
    }

    const updatedTrip = await Trip.findOneAndUpdate(
      {
        _id: joinRequest.tripId,
        participants: { $ne: requesterObjectId },
        status: { $ne: CANCELLED_TRIP_STATUS },
        $expr: {
          $lt: [{ $size: { $ifNull: ['$participants', []] } }, '$maxParticipants'],
        },
      },
      {
        $addToSet: {
          participants: requesterObjectId,
        },
      },
      {
        new: true,
      },
    ).select('_id organizerId maxParticipants participants');

    let tripSnapshot = updatedTrip;
    const didAddParticipant = Boolean(updatedTrip);
    if (!tripSnapshot) {
      const existingTrip = await Trip.findById(joinRequest.tripId).select(
        '_id organizerId maxParticipants participants status',
      );
      if (!existingTrip) {
        return res.status(404).json({ message: 'Trip not found.' });
      }

      const existingTripStatus = getTripStatus(existingTrip.status);
      if (existingTripStatus === CANCELLED_TRIP_STATUS) {
        return res.status(409).json({ message: 'Trip is cancelled and cannot accept join requests.' });
      }

      const participantIds = toParticipantIds(existingTrip.participants);
      if (participantIds.includes(String(joinRequest.requesterId))) {
        tripSnapshot = existingTrip;
      } else if (participantIds.length >= existingTrip.maxParticipants) {
        return res.status(409).json({ message: 'Trip has reached the maximum participant limit.' });
      } else {
        return res.status(409).json({ message: 'Unable to accept join request right now.' });
      }
    }

    const acceptedRequest = await TripJoinRequest.findOneAndUpdate(
      {
        _id: joinRequest._id,
        hostId: hostObjectId,
        status: 'pending',
      },
      {
        $set: { status: 'accepted' },
      },
      {
        new: true,
      },
    );

    if (!acceptedRequest) {
      if (didAddParticipant) {
        await Trip.updateOne(
          { _id: joinRequest.tripId },
          { $pull: { participants: requesterObjectId } },
        );
      }

      const latestRequest = await TripJoinRequest.findById(requestId).select('status');
      if (latestRequest?.status && latestRequest.status !== 'pending') {
        return res.status(409).json({ message: `Request already ${latestRequest.status}.` });
      }

      return res.status(409).json({ message: 'Unable to accept join request right now.' });
    }

    await Participant.updateOne(
      {
        tripId: joinRequest.tripId,
        userId: joinRequest.hostId,
      },
      {
        $setOnInsert: { role: 'host' },
      },
      {
        upsert: true,
      },
    );

    await Participant.updateOne(
      {
        tripId: joinRequest.tripId,
        userId: joinRequest.requesterId,
      },
      {
        $setOnInsert: { role: 'participant' },
      },
      {
        upsert: true,
      },
    );

    const participantIds = toParticipantIds(tripSnapshot.participants);
    const spotsFilled = participantIds.length;

    return res.status(200).json({
      message: 'Join request accepted.',
      request: {
        id: acceptedRequest._id.toString(),
        tripId: acceptedRequest.tripId.toString(),
        requesterId: acceptedRequest.requesterId.toString(),
        hostId: acceptedRequest.hostId.toString(),
        status: acceptedRequest.status,
        updatedAt: acceptedRequest.updatedAt,
      },
      trip: {
        id: tripSnapshot._id.toString(),
        hostId: tripSnapshot.organizerId.toString(),
        maxParticipants: tripSnapshot.maxParticipants,
        spotsFilled,
        spotsFilledPercent: toSpotsFilledPercent(spotsFilled, tripSnapshot.maxParticipants),
        participantIds,
      },
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return res.status(409).json({ message: 'Participant already exists for this trip.' });
    }

    console.error('PATCH /api/join-requests/:requestId failed', error);
    return res.status(500).json({ message: 'Unable to update join request right now.' });
  }
});

export default router;
