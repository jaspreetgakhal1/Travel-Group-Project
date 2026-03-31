import React from 'react';
import { motion } from 'framer-motion';
import { Clock3, PencilLine, ReceiptText, Trash2, Users } from 'lucide-react';
import type { TripExpenseSummary } from '../services/expenseApi';

type TripExpense = TripExpenseSummary['expenses'][number];

type ExpenseItemProps = {
  expense: TripExpense;
  currentUserId: string | null | undefined;
  canEdit: boolean;
  isDeleting: boolean;
  onDelete: (expenseId: string) => void;
  onEdit: (expense: TripExpense) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
});

const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  currentUserId,
  canEdit,
  isDeleting,
  onDelete,
  onEdit,
}) => {
  const canDelete = Boolean(currentUserId && currentUserId === expense.createdBy);
  const wasEdited = Boolean(expense.lastUpdatedBy && expense.updatedAt !== expense.createdAt);
  const activityTimestamp = dateFormatter.format(new Date(wasEdited ? expense.updatedAt : expense.createdAt));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -14 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[30px] bg-white/92 px-5 py-4 shadow-xl shadow-slate-950/10"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/6 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-primary">{expense.description}</p>
              <p className="mt-1 text-sm text-primary/60">
                Paid by {expense.paidBy.name} and split {expense.memberCount} ways at ${expense.splitAmount.toFixed(2)} each
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/45">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/75 px-3 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              {wasEdited ? 'Edited' : 'Added'} {activityTimestamp}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/75 px-3 py-1">
              <Users className="h-3.5 w-3.5" />
              {expense.memberCount} travelers
            </span>
          </div>

          {wasEdited ? (
            <p className="mt-3 text-xs text-primary/50">Last updated by {expense.lastUpdatedByName ?? 'a trip member'}.</p>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <div className="rounded-[26px] bg-[linear-gradient(155deg,rgba(61,64,91,0.96),rgba(90,95,132,0.88))] px-4 py-3 text-right text-white shadow-lg shadow-primary/20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">Amount</p>
            <p className="mt-1 text-lg font-black">${expense.amount.toFixed(2)}</p>
          </div>

          <div className="flex gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={() => onEdit(expense)}
                className="interactive-btn rounded-full bg-white p-2.5 text-primary shadow-lg shadow-slate-950/10"
                aria-label={`Edit ${expense.description}`}
              >
                <PencilLine className="h-4 w-4" />
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(expense.id)}
                disabled={isDeleting}
                className="interactive-btn rounded-full bg-red-50 p-2.5 text-red-600 shadow-lg shadow-red-200/60 disabled:cursor-not-allowed disabled:opacity-55"
                aria-label={`Delete ${expense.description}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default ExpenseItem;
