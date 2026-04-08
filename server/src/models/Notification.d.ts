import { HydratedDocument, Model, Types } from 'mongoose';
export declare const NOTIFICATION_TYPE_VALUES: readonly ["verification_verified", "verification_rejected", "trip_vote_decided"];
export interface INotification {
    userId: Types.ObjectId;
    type: (typeof NOTIFICATION_TYPE_VALUES)[number];
    title: string;
    message: string;
    isRead: boolean;
    metadata?: {
        rejectionReason?: string | null;
        tripId?: string | null;
        voteId?: string | null;
        placeName?: string | null;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}
export type NotificationDocument = HydratedDocument<INotification>;
type NotificationModelType = Model<INotification>;
export declare const Notification: NotificationModelType;
export {};
//# sourceMappingURL=Notification.d.ts.map