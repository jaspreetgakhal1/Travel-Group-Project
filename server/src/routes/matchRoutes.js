import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Post } from '../models/Post.js';

const router = express.Router();

const TRAVEL_DNA_FIELDS = [
  'socialBattery',
  'planningStyle',
  'budgetFlexibility',
  'morningSync',
  'riskAppetite',
  'cleanliness',
];
const DEFAULT_DNA_VALUE = 5;
const MAX_EUCLIDEAN_DISTANCE = Math.sqrt(TRAVEL_DNA_FIELDS.length * 81);

const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7).trim() || null;
};

const getAuthenticatedUserId = (request) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
};

const getDNAFieldValue = (dna, fieldName) => {
  const value = dna && typeof dna === 'object' ? dna[fieldName] : null;
  if (!Number.isFinite(value)) {
    return DEFAULT_DNA_VALUE;
  }
  return Math.max(1, Math.min(10, value));
};

const getConflictHint = (viewerDNA, organizerDNA) => {
  const scoreGaps = TRAVEL_DNA_FIELDS.map((fieldName) => ({
    fieldName,
    gap: Math.abs(getDNAFieldValue(viewerDNA, fieldName) - getDNAFieldValue(organizerDNA, fieldName)),
  })).sort((left, right) => right.gap - left.gap);

  const strongestGap = scoreGaps[0];
  if (!strongestGap || strongestGap.gap < 4) {
    return 'Minor differences only. Core travel vibe is mostly aligned.';
  }

  if (strongestGap.fieldName === 'morningSync') {
    const viewerIsEarlyBird = getDNAFieldValue(viewerDNA, 'morningSync') >= getDNAFieldValue(organizerDNA, 'morningSync');
    return viewerIsEarlyBird ? 'Morning person vs. night owl scheduling mismatch.' : 'Night owl vs. early riser scheduling mismatch.';
  }

  if (strongestGap.fieldName === 'budgetFlexibility') {
    return 'Budget style conflict: saver mindset vs. flexible spender.';
  }

  if (strongestGap.fieldName === 'planningStyle') {
    return 'Planning conflict: structured planner vs. spontaneous explorer.';
  }

  if (strongestGap.fieldName === 'riskAppetite') {
    return 'Risk mismatch: adventure-seeking vs. safety-first decisions.';
  }

  if (strongestGap.fieldName === 'cleanliness') {
    return 'Cleanliness expectations are far apart for shared spaces.';
  }

  return 'Social battery mismatch: one prefers quiet time while the other prefers constant group activity.';
};

const buildDistanceExpression = () => ({
  $sqrt: {
    $add: TRAVEL_DNA_FIELDS.map((fieldName) => ({
      $pow: [
        {
          $subtract: [
            { $ifNull: [`$viewer.travelDNA.${fieldName}`, DEFAULT_DNA_VALUE] },
            { $ifNull: [`$organizer.travelDNA.${fieldName}`, DEFAULT_DNA_VALUE] },
          ],
        },
        2,
      ],
    })),
  },
});

router.get('/:tripId', async (request, response) => {
  const authenticatedUserId = getAuthenticatedUserId(request);
  if (!authenticatedUserId) {
    return response.status(401).json({ message: 'Unauthorized request.' });
  }

  if (!mongoose.isValidObjectId(authenticatedUserId)) {
    return response.status(401).json({ message: 'Unauthorized request.' });
  }

  const { tripId } = request.params;
  if (!mongoose.isValidObjectId(tripId)) {
    return response.status(400).json({ message: 'Trip id is invalid.' });
  }

  const tripObjectId = new mongoose.Types.ObjectId(tripId);
  const viewerObjectId = new mongoose.Types.ObjectId(authenticatedUserId);

  try {
    const aggregateResult = await Post.aggregate([
      {
        $match: {
          _id: tripObjectId,
        },
      },
      {
        $addFields: {
          normalizedAuthorKey: {
            $toLower: {
              $trim: {
                input: {
                  $ifNull: ['$authorKey', { $ifNull: ['$hostName', ''] }],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { organizerAuthorKey: '$normalizedAuthorKey' },
          pipeline: [
            {
              $addFields: {
                normalizedEmail: { $toLower: { $ifNull: ['$email', ''] } },
                normalizedUserId: { $toLower: { $ifNull: ['$userId', ''] } },
              },
            },
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$normalizedEmail', '$$organizerAuthorKey'] },
                    { $eq: ['$normalizedUserId', '$$organizerAuthorKey'] },
                  ],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                userId: 1,
                travelDNA: 1,
              },
            },
          ],
          as: 'organizer',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { viewerUserId: viewerObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$viewerUserId'],
                },
              },
            },
            {
              $project: {
                userId: 1,
                travelDNA: 1,
              },
            },
          ],
          as: 'viewer',
        },
      },
      {
        $unwind: {
          path: '$organizer',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$viewer',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          distance: buildDistanceExpression(),
        },
      },
      {
        $addFields: {
          matchPercentage: {
            $round: [
              {
                $max: [
                  0,
                  {
                    $multiply: [
                      {
                        $subtract: [1, { $divide: ['$distance', MAX_EUCLIDEAN_DISTANCE] }],
                      },
                      100,
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          tripId: { $toString: '$_id' },
          hostName: 1,
          matchPercentage: 1,
          viewerDNA: '$viewer.travelDNA',
          organizerDNA: '$organizer.travelDNA',
          organizerFirstName: '$organizer.firstName',
          organizerLastName: '$organizer.lastName',
          organizerUserId: '$organizer.userId',
        },
      },
    ]);

    if (!aggregateResult[0]) {
      return response.status(404).json({ message: 'Unable to compute DNA match for this trip.' });
    }

    const matchedTrip = aggregateResult[0];
    const organizerName = `${(matchedTrip.organizerFirstName ?? '').trim()} ${(matchedTrip.organizerLastName ?? '').trim()}`.trim();

    return response.status(200).json({
      tripId: matchedTrip.tripId,
      matchPercentage: Number.isFinite(matchedTrip.matchPercentage) ? matchedTrip.matchPercentage : 0,
      organizerName: organizerName || matchedTrip.hostName || matchedTrip.organizerUserId || 'Organizer',
      viewerDNA: matchedTrip.viewerDNA,
      organizerDNA: matchedTrip.organizerDNA,
      conflictHint: getConflictHint(matchedTrip.viewerDNA, matchedTrip.organizerDNA),
    });
  } catch (error) {
    console.error('Match route failed', error);
    return response.status(500).json({ message: 'Unable to compute match right now.' });
  }
});

export default router;
