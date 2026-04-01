import { HydratedDocument, Model, Types } from 'mongoose';
import { TRIP_STATUS_VALUES } from '../utils/tripStatus.js';
export interface ITrip {
    organizerId: Types.ObjectId;
    title: string;
    description?: string;
    location: string;
    imageUrl?: string;
    price?: number;
    expectedBudget: number;
    category?: 'Adventure' | 'Luxury' | 'Budget' | 'Nature';
    startDate: Date;
    endDate: Date;
    status: (typeof TRIP_STATUS_VALUES)[number];
    maxParticipants: number;
    participants: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ITripVirtuals {
    currentParticipantCount?: number;
}
export type TripDocument = HydratedDocument<ITrip, ITripVirtuals>;
type TripModelType = Model<ITrip, {}, {}, ITripVirtuals>;
export declare const Trip: TripModelType;
export {};
//# sourceMappingURL=Trip.d.ts.map