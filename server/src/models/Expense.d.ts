import { HydratedDocument, Model, Types } from 'mongoose';
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
export declare const Expense: ExpenseModelType;
export {};
//# sourceMappingURL=Expense.d.ts.map