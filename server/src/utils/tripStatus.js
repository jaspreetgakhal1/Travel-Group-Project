export const TRIP_STATUS_VALUES = ['Active', 'Completed', 'Cancelled'];
export const ACTIVE_TRIP_STATUS = 'Active';
export const COMPLETED_TRIP_STATUS = 'Completed';
export const CANCELLED_TRIP_STATUS = 'Cancelled';

const toDate = (value) => {
  const parsedDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const toDayStart = (value) => {
  const parsedDate = toDate(value);
  if (!parsedDate) {
    return null;
  }

  const normalizedDate = new Date(parsedDate);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
};

export const toDayEnd = (value) => {
  const parsedDate = toDate(value);
  if (!parsedDate) {
    return null;
  }

  const normalizedDate = new Date(parsedDate);
  normalizedDate.setHours(23, 59, 59, 999);
  return normalizedDate;
};

export const normalizeTripDateRange = (startDateValue, endDateValue) => {
  const startDate = toDayStart(startDateValue);
  const endDate = toDayEnd(endDateValue);

  if (!startDate || !endDate) {
    return null;
  }

  if (endDate < startDate) {
    return null;
  }

  return { startDate, endDate };
};

export const isTripCurrentActive = ({ startDate, endDate, status } = {}, referenceDate = new Date()) => {
  if (status === CANCELLED_TRIP_STATUS) {
    return false;
  }

  const startBoundary = toDayStart(startDate);
  const endBoundary = toDayEnd(endDate);
  const currentDay = toDayStart(referenceDate);

  if (!startBoundary || !endBoundary || !currentDay) {
    return false;
  }

  return startBoundary <= currentDay && endBoundary >= currentDay;
};
