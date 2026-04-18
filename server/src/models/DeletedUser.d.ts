import type { HydratedDocument, Model, Types } from 'mongoose';

export type DeletedUserVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface DeletedUserRecord {
  originalUserId: Types.ObjectId;
  deletedByUserId: Types.ObjectId | null;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  profileImageDataUrl: string | null;
  isBlocked: boolean;
  blockedAt: Date | null;
  blockedReason: string | null;
  verificationStatus: DeletedUserVerificationStatus;
  verificationDocumentName: string | null;
  verificationDocumentMimeType: string | null;
  verificationUploadedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date | null;
  deletedAt: Date;
}

export type DeletedUserDocument = HydratedDocument<DeletedUserRecord>;

export declare const DeletedUser: Model<DeletedUserRecord>;
