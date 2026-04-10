import { HydratedDocument, Model, Types } from 'mongoose';
export declare const VOTE_SESSION_STATUS_VALUES: readonly ["open", "decided", "archived"];
export declare const VOTE_SESSION_DECISION_MODE_VALUES: readonly ["majority", "host_closed"];
export interface IVote {
    tripId: Types.ObjectId;
    sourceSuggestionId: string;
    placeName: string;
    description: string;
    estimatedCost: number;
    imageUrl: string;
    votes: Types.ObjectId[];
    status: (typeof VOTE_SESSION_STATUS_VALUES)[number];
    createdByUserId: Types.ObjectId;
    decidedByUserId?: Types.ObjectId | null;
    decisionMode?: (typeof VOTE_SESSION_DECISION_MODE_VALUES)[number] | null;
    decisionMadeAt?: Date | null;
    notificationSentAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type VoteDocument = HydratedDocument<IVote>;
type VoteModelType = Model<IVote>;
export declare const Vote: VoteModelType;
export {};
//# sourceMappingURL=Vote.d.ts.map