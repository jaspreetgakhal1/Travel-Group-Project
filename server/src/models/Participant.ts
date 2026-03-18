import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

const { model, models } = mongoose;

export const PARTICIPANT_ROLES = ['host', 'participant'] as const;
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

const participantSchema = new Schema<IParticipant, ParticipantModelType>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: PARTICIPANT_ROLES,
      required: true,
      default: 'participant',
    },
  },
  {
    timestamps: true,
  },
);

participantSchema.index({ tripId: 1, userId: 1 }, { unique: true });
participantSchema.index({ userId: 1, createdAt: -1 });
participantSchema.index({ tripId: 1, role: 1 });

export const Participant =
  (models.Participant as ParticipantModelType | undefined) ||
  model<IParticipant, ParticipantModelType>('Participant', participantSchema);

