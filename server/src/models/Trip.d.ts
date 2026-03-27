import { HydratedDocument, Model, Types } from 'mongoose';
export interface ITrip {
    organizerId: Types.ObjectId;
    title: string;
    description?: string;
    location: string;
    imageUrl?: string;
    price?: number;
    category?: 'Adventure' | 'Luxury' | 'Budget' | 'Nature';
    startDate: Date;
    endDate: Date;
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