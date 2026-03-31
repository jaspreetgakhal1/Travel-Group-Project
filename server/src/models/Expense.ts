import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

const { model, models } = mongoose;

export interface IExpenseSettlement {
  userId: Types.ObjectId;
  owesToUserId: Types.ObjectId;
  amount: number;
}

export interface IExpense {
  tripId: Types.ObjectId;
  paidBy: Types.ObjectId;
  createdBy: Types.ObjectId;
  lastUpdatedBy?: Types.ObjectId | null;
  description: string;
  amount: number;
  splitAmount: number;
  memberCount: number;
  memberUserIds: Types.ObjectId[];
  debtorUserIds: Types.ObjectId[];
  settlements: IExpenseSettlement[];
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseDocument = HydratedDocument<IExpense>;
type ExpenseModelType = Model<IExpense>;

const settlementSchema = new Schema<IExpenseSettlement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owesToUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const expenseSchema = new Schema<IExpense, ExpenseModelType>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    splitAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    memberCount: {
      type: Number,
      required: true,
      min: 1,
    },
    memberUserIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    debtorUserIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    settlements: {
      type: [settlementSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ tripId: 1, createdAt: -1 });

export const Expense =
  (models.Expense as ExpenseModelType | undefined) || model<IExpense, ExpenseModelType>('Expense', expenseSchema);
