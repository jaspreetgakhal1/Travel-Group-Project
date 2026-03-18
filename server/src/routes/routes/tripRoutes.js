import express from 'express';
import mongoose, { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Participant } from '../models/Participant.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
const router = express.Router();
const REQUEST_STATUSES = ['pending', 'accepted', 'rejected'];
const isRequestStatus = (value) => typeof value === 'string' && REQUEST_STATUSES.includes(value);
router.get('/self', requireAuth, async (req, res) => {
    const authRequest = req;
    const hostId = authRequest.user?.id;
    if (!hostId || !mongoose.isValidObjectId(hostId)) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const hostObjectId = new Types.ObjectId(hostId);
        const trips = await Trip.find({
            organizerId: hostObjectId,
        })
            .sort({ createdAt: -1 })
            .select('_id organizerId title location startDate endDate maxParticipants createdAt updatedAt')
            .lean();
        if (trips.length === 0) {
            return res.status(200).json({ trips: [] });
        }
        const tripObjectIds = trips.map((trip) => new Types.ObjectId(String(trip._id)));
        const pendingCounts = await TripJoinRequest.aggregate([
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
        const pendingCountByTripId = pendingCounts.reduce((accumulator, currentValue) => {
            accumulator[String(currentValue._id)] = currentValue.pendingRequestCount;
            return accumulator;
        }, {});
        return res.status(200).json({
            trips: trips.map((trip) => {
                const tripId = String(trip._id);
                return {
                    id: tripId,
                    hostId: String(trip.organizerId),
                    title: trip.title,
                    location: trip.location,
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    maxParticipants: trip.maxParticipants,
                    pendingRequestCount: pendingCountByTripId[tripId] ?? 0,
                    createdAt: trip.createdAt,
                    updatedAt: trip.updatedAt,
                };
            }),
        });
    }
    catch (error) {
        console.error('GET /api/trips/self failed', error);
        return res.status(500).json({ message: 'Unable to load your trips right now.' });
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
        const trip = await Trip.findById(tripId).select('_id organizerId maxParticipants').lean();
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        const requesterObjectId = new Types.ObjectId(requesterId);
        const hostObjectId = new Types.ObjectId(String(trip.organizerId));
        if (hostObjectId.equals(requesterObjectId)) {
            return res.status(400).json({ message: 'Host cannot send a join request for their own trip.' });
        }
        const existingParticipant = await Participant.findOne({
            tripId: new Types.ObjectId(tripId),
            userId: requesterObjectId,
        })
            .select('_id')
            .lean();
        if (existingParticipant) {
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
export default router;
