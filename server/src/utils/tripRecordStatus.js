import { normalizeTripDateRange, toDayEnd, toDayStart } from './tripStatus.js';
export const TRIP_RECORD_STATUS_VALUES = ['upcoming', 'active', 'completed', 'cancelled'];
export const UPCOMING_TRIP_STATUS = 'upcoming';
export const ACTIVE_TRIP_STATUS = 'active';
export const COMPLETED_TRIP_STATUS = 'completed';
export const CANCELLED_TRIP_STATUS = 'cancelled';
export const LEGACY_ACTIVE_TRIP_STATUS = 'Active';
export const LEGACY_COMPLETED_TRIP_STATUS = 'Completed';
export const LEGACY_CANCELLED_TRIP_STATUS = 'Cancelled';
export const CANCELLED_TRIP_STATUS_VALUES = [CANCELLED_TRIP_STATUS, LEGACY_CANCELLED_TRIP_STATUS];
export const COMPLETED_TRIP_STATUS_VALUES = [COMPLETED_TRIP_STATUS, LEGACY_COMPLETED_TRIP_STATUS];
export const ACTIVE_TRIP_STATUS_VALUES = [ACTIVE_TRIP_STATUS, LEGACY_ACTIVE_TRIP_STATUS];
const isStatusValue = (value) => typeof value === 'string' && TRIP_RECORD_STATUS_VALUES.includes(value);
const deriveStatusFromDates = (trip, referenceDate = new Date()) => {
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
export const normalizeTripRecordStatus = (value, trip = {}, referenceDate = new Date()) => {
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
export const getDefaultTripRecordStatus = (trip, referenceDate = new Date()) => deriveStatusFromDates(trip, referenceDate);
export const isTripCurrentActive = (trip, referenceDate = new Date()) => normalizeTripRecordStatus(trip.status, trip, referenceDate) === ACTIVE_TRIP_STATUS;
