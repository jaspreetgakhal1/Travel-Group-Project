import { Post } from '../models/Post.js';
import { Trip } from '../models/Trip.js';
import { ACTIVE_TRIP_STATUS, COMPLETED_TRIP_STATUS, toDayStart } from './tripStatus.js';

export const markPastTripsCompleted = async (referenceDate = new Date()) => {
  const todayStart = toDayStart(referenceDate);
  if (!todayStart) {
    return;
  }

  const completionFilter = {
    status: ACTIVE_TRIP_STATUS,
    endDate: { $lt: todayStart },
  };

  await Promise.all([
    Post.updateMany(completionFilter, { $set: { status: COMPLETED_TRIP_STATUS } }),
    Trip.updateMany(completionFilter, { $set: { status: COMPLETED_TRIP_STATUS } }),
  ]);
};
