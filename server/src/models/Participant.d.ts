import { HydratedDocument, Model, Types } from 'mongoose';
export declare const PARTICIPANT_ROLES: readonly ["host", "participant"];
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];
export interface IParticipant {
    tripId: Types.ObjectId;
    userId: Types.ObjectId;
    role: ParticipantRole;
    createdAt: Date;
    updatedAt: Date;
}
export type ParticipantDocument = HydratedDocument<IParticipant>;
type ParticipantModelType = Model<IParticipant>;
export declare const Participant: ParticipantModelType;
export {};
//# sourceMappingURL=Participant.d.ts.map