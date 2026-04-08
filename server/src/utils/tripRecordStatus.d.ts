export declare const TRIP_RECORD_STATUS_VALUES: readonly ["upcoming", "active", "completed", "cancelled"];
export declare const UPCOMING_TRIP_STATUS = "upcoming";
export declare const ACTIVE_TRIP_STATUS = "active";
export declare const COMPLETED_TRIP_STATUS = "completed";
export declare const CANCELLED_TRIP_STATUS = "cancelled";
export declare const LEGACY_ACTIVE_TRIP_STATUS = "Active";
export declare const LEGACY_COMPLETED_TRIP_STATUS = "Completed";
export declare const LEGACY_CANCELLED_TRIP_STATUS = "Cancelled";
export declare const CANCELLED_TRIP_STATUS_VALUES: readonly ["cancelled", "Cancelled"];
export declare const COMPLETED_TRIP_STATUS_VALUES: readonly ["completed", "Completed"];
export declare const ACTIVE_TRIP_STATUS_VALUES: readonly ["active", "Active"];
type TripDateRangeLike = {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
};
export declare const normalizeTripRecordStatus: (value: unknown, trip?: TripDateRangeLike, referenceDate?: Date) => (typeof TRIP_RECORD_STATUS_VALUES)[number];
export declare const getDefaultTripRecordStatus: (trip: TripDateRangeLike, referenceDate?: Date) => (typeof TRIP_RECORD_STATUS_VALUES)[number];
export declare const isTripCurrentActive: (trip: TripDateRangeLike & {
    status?: unknown;
}, referenceDate?: Date) => boolean;
export {};
//# sourceMappingURL=tripRecordStatus.d.ts.map