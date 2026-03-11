import type { Request, RequestHandler } from 'express';
import mongoose, { Types } from 'mongoose';
import { Participant } from '../models/Participant.js';
import { Trip } from '../models/Trip.js';
import type { AuthenticatedUser } from '../types/auth.js';

const resolveTripId = (req: Request): string | null => {
  if (typeof req.params.tripId === 'string' && req.params.tripId.trim()) {
    return req.params.tripId.trim();
  }

  if (typeof req.query.tripId === 'string' && req.query.tripId.trim()) {
    return req.query.tripId.trim();
  }

  if (typeof req.body?.tripId === 'string' && req.body.tripId.trim()) {
    return req.body.tripId.trim();
  }

  return null;
};

export const verifyTripAccess: RequestHandler = async (req, res, next) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const userId = authRequest.user?.id;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  const tripId = resolveTripId(req);
  if (!tripId || !mongoose.isValidObjectId(tripId)) {
    return res.status(400).json({ message: 'Trip id is invalid.' });
  }

  try {
    const trip = await Trip.findById(tripId).select('organizerId participants').lean();
    if (trip) {
      const isOrganizer = String(trip.organizerId) === userId;
      const isTripParticipant = Array.isArray(trip.participants)
        ? trip.participants.some((participantId) => String(participantId) === userId)
        : false;

      if (isOrganizer || isTripParticipant) {
        return next();
      }
    }

    const accessRecord = await Participant.exists({
      tripId: new Types.ObjectId(tripId),
      userId: new Types.ObjectId(userId),
    });

    if (!accessRecord) {
      return res.status(403).json({ message: 'Access denied for this trip.' });
    }

    return next();
  } catch (error) {
    console.error('verifyTripAccess middleware failed', error);
    return res.status(500).json({ message: 'Unable to verify trip access right now.' });
  }
};
