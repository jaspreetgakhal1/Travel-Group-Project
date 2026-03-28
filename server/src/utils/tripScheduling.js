import mongoose, { Types } from 'mongoose';
import { Trip } from '../models/Trip.js';
export {
  ACTIVE_TRIP_STATUS,
  CANCELLED_TRIP_STATUS,
  COMPLETED_TRIP_STATUS,
  TRIP_STATUS_VALUES,
  isTripCurrentActive,
  normalizeTripDateRange,
  toDayEnd,
  toDayStart,
} from './tripStatus.js';
import { CANCELLED_TRIP_STATUS, normalizeTripDateRange } from './tripStatus.js';
export const TRIP_OVERLAP_ERROR_MESSAGE =
  'Logic Error: You are already committed to another trip during these dates. You cannot be in two places at once.';

const toObjectId = (value) => {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string' && mongoose.isValidObjectId(value)) {
    return new Types.ObjectId(value);
  }

  return null;
};

export const buildTripOverlapQuery = ({ userId, startDate, endDate, excludeTripId } = {}) => {
  const userObjectId = toObjectId(userId);
  const normalizedDateRange = normalizeTripDateRange(startDate, endDate);

  if (!userObjectId || !normalizedDateRange) {
    return null;
  }

  const overlapQuery = {
    status: { $ne: CANCELLED_TRIP_STATUS },
    $or: [{ organizerId: userObjectId }, { participants: userObjectId }],
    startDate: { $lte: normalizedDateRange.endDate },
    endDate: { $gte: normalizedDateRange.startDate },
  };

  const excludedTripObjectId = toObjectId(excludeTripId);
  if (excludedTripObjectId) {
    overlapQuery._id = { $ne: excludedTripObjectId };
  }

  return overlapQuery;
};

export const findTripOverlap = async (options = {}) => {
  const overlapQuery = buildTripOverlapQuery(options);
  if (!overlapQuery) {
    return null;
  }

  return Trip.findOne(overlapQuery)
    .select('_id organizerId title startDate endDate status participants')
    .lean();
};
