import { normalizeTripDateRange, toDayEnd, toDayStart } from './tripStatus.js';

export const TRIP_RECORD_STATUS_VALUES = ['upcoming', 'active', 'completed', 'cancelled'] as const;

export const UPCOMING_TRIP_STATUS = 'upcoming';
export const ACTIVE_TRIP_STATUS = 'active';
export const COMPLETED_TRIP_STATUS = 'completed';
export const CANCELLED_TRIP_STATUS = 'cancelled';

export const LEGACY_ACTIVE_TRIP_STATUS = 'Active';
export const LEGACY_COMPLETED_TRIP_STATUS = 'Completed';
export const LEGACY_CANCELLED_TRIP_STATUS = 'Cancelled';

export const CANCELLED_TRIP_STATUS_VALUES = [CANCELLED_TRIP_STATUS, LEGACY_CANCELLED_TRIP_STATUS] as const;
export const COMPLETED_TRIP_STATUS_VALUES = [COMPLETED_TRIP_STATUS, LEGACY_COMPLETED_TRIP_STATUS] as const;
export const ACTIVE_TRIP_STATUS_VALUES = [ACTIVE_TRIP_STATUS, LEGACY_ACTIVE_TRIP_STATUS] as const;

type TripDateRangeLike = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

const isStatusValue = (value: unknown): value is (typeof TRIP_RECORD_STATUS_VALUES)[number] =>
  typeof value === 'string' && TRIP_RECORD_STATUS_VALUES.includes(value as (typeof TRIP_RECORD_STATUS_VALUES)[number]);

const deriveStatusFromDates = (
  trip: TripDateRangeLike,
  referenceDate: Date = new Date(),
): (typeof TRIP_RECORD_STATUS_VALUES)[number] => {
  const normalizedDateRange = normalizeTripDateRange(trip?.startDate, trip?.endDate);
  const todayStart = toDayStart(referenceDate);
  const todayEnd = toDayEnd(referenceDate);

  if (!normalizedDateRange || !todayStart || !todayEnd) {
    return ACTIVE_TRIP_STATUS;
  }

  if (normalizedDateRange.endDate < todayStart) {
    return COMPLETED_TRIP_STATUS;
  }

  if (normalizedDateRange.startDate > todayEnd) {
    return UPCOMING_TRIP_STATUS;
  }

  return ACTIVE_TRIP_STATUS;
};

export const normalizeTripRecordStatus = (
  value: unknown,
  trip: TripDateRangeLike = {},
  referenceDate: Date = new Date(),
): (typeof TRIP_RECORD_STATUS_VALUES)[number] => {
  if (value === CANCELLED_TRIP_STATUS || value === LEGACY_CANCELLED_TRIP_STATUS) {
    return CANCELLED_TRIP_STATUS;
  }

  if (value === COMPLETED_TRIP_STATUS || value === LEGACY_COMPLETED_TRIP_STATUS) {
    return COMPLETED_TRIP_STATUS;
  }

  if (value === UPCOMING_TRIP_STATUS) {
    return UPCOMING_TRIP_STATUS;
  }

  if (value === ACTIVE_TRIP_STATUS || value === LEGACY_ACTIVE_TRIP_STATUS) {
    return deriveStatusFromDates(trip, referenceDate);
  }

  if (isStatusValue(value)) {
    return value;
  }

  return deriveStatusFromDates(trip, referenceDate);
};

export const getDefaultTripRecordStatus = (
  trip: TripDateRangeLike,
  referenceDate: Date = new Date(),
): (typeof TRIP_RECORD_STATUS_VALUES)[number] => deriveStatusFromDates(trip, referenceDate);

export const isTripCurrentActive = (trip: TripDateRangeLike & { status?: unknown }, referenceDate: Date = new Date()): boolean =>
  normalizeTripRecordStatus(trip.status, trip, referenceDate) === ACTIVE_TRIP_STATUS;
