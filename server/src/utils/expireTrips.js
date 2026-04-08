import { Post } from '../models/Post.js';
import { Trip } from '../models/Trip.js';
import { COMPLETED_TRIP_STATUS, toDayStart } from './tripStatus.js';
import {
  CANCELLED_TRIP_STATUS_VALUES,
  COMPLETED_TRIP_STATUS as TRIP_COMPLETED_STATUS,
  COMPLETED_TRIP_STATUS_VALUES,
} from './tripRecordStatus.js';

export const markPastTripsCompleted = async (referenceDate = new Date()) => {
  const todayStart = toDayStart(referenceDate);
  if (!todayStart) {
    return;
  }

  const postCompletionFilter = {
    status: 'Active',
    endDate: { $lt: todayStart },
  };
  const tripCompletionFilter = {
    status: {
      $nin: [...CANCELLED_TRIP_STATUS_VALUES, ...COMPLETED_TRIP_STATUS_VALUES],
    },
    endDate: { $lt: todayStart },
  };

  await Promise.all([
    Post.updateMany(postCompletionFilter, { $set: { status: COMPLETED_TRIP_STATUS } }),
    Trip.updateMany(tripCompletionFilter, { $set: { status: TRIP_COMPLETED_STATUS } }),
  ]);
};
