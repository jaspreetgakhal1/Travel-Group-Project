import { HydratedDocument, Model, Types } from 'mongoose';
import { TRIP_RECORD_STATUS_VALUES } from '../utils/tripRecordStatus.js';
declare const CURRENCY_VALUES: readonly ["USD", "CAD", "EUR", "GBP", "INR", "AUD", "JPY"];
export interface ITripSuggestion {
    _id: Types.ObjectId;
    name: string;
    whyVisit: string;
    estimatedCostPerPerson: number;
    vibeMatchPercent: number;
    imageUrl: string;
    voteUserIds: Types.ObjectId[];
    createdAt: Date;
}
export interface ITripSuggestionPreferences {
    collectiveMood: string;
    interest: string;
    budget: string;
    food: string;
    crowds: string;
}
export interface ITripEmergencyContact {
    name: string;
    phone: string;
}
export interface ITrip {
    organizerId: Types.ObjectId;
    title: string;
    description?: string;
    location: string;
    imageUrl?: string;
    price?: number;
    expectedBudget: number;
    travelerType?: string;
    currency: (typeof CURRENCY_VALUES)[number];
    isPrivate: boolean;
    emergencyContact: ITripEmergencyContact;
    category?: 'Adventure' | 'Luxury' | 'Budget' | 'Nature';
    startDate: Date;
    endDate: Date;
    status: (typeof TRIP_RECORD_STATUS_VALUES)[number];
    maxParticipants: number;
    participants: Types.ObjectId[];
    suggestions: ITripSuggestion[];
    suggestionPreferences?: ITripSuggestionPreferences | null;
    suggestionsGeneratedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface ITripVirtuals {
    currentParticipantCount?: number;
}
export type TripDocument = HydratedDocument<ITrip, ITripVirtuals>;
type TripModelType = Model<ITrip, {}, {}, ITripVirtuals>;
export declare const getTripExpectedBudgetDefault: (tripValue?: Partial<ITrip> | null) => number;
export declare const Trip: TripModelType;
export {};
//# sourceMappingURL=Trip.d.ts.map