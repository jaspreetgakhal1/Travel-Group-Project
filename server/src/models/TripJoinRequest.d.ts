import { HydratedDocument, Model, Types } from 'mongoose';
export declare const TRIP_JOIN_REQUEST_STATUSES: readonly ["pending", "accepted", "rejected"];
export type TripJoinRequestStatus = (typeof TRIP_JOIN_REQUEST_STATUSES)[number];
export interface ITripJoinRequest {
    tripId: Types.ObjectId;
    requesterId: Types.ObjectId;
    hostId: Types.ObjectId;
    status: TripJoinRequestStatus;
    createdAt: Date;
    updatedAt: Date;
}
export type TripJoinRequestDocument = HydratedDocument<ITripJoinRequest>;
type TripJoinRequestModelType = Model<ITripJoinRequest>;
export declare const TripJoinRequest: TripJoinRequestModelType;
export {};
//# sourceMappingURL=TripJoinRequest.d.ts.map