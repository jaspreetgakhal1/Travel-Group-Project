import React from 'react';
import { motion } from 'framer-motion';

type ExpenseEmptyStateProps = {
  description: string;
  title: string;
};

const ExpenseEmptyState: React.FC<ExpenseEmptyStateProps> = ({ description, title }) => {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/80 px-5 py-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#fff6ec]/90">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-0"
          >
            <svg viewBox="0 0 120 120" className="h-full w-full">
              <rect x="30" y="34" width="46" height="50" rx="10" fill="#f6c59f" />
              <rect x="42" y="22" width="22" height="12" rx="6" fill="none" stroke="#e07a5f" strokeWidth="6" />
              <rect x="76" y="42" width="16" height="36" rx="8" fill="#f2cc8f" />
              <circle cx="42" cy="88" r="5" fill="#3d405b" opacity="0.2" />
              <circle cx="64" cy="88" r="5" fill="#3d405b" opacity="0.2" />
              <path d="M88 72c5 0 9 4 9 9" fill="none" stroke="#81b29a" strokeLinecap="round" strokeWidth="5" />
              <path d="M96 56c5 0 9 4 9 9" fill="none" stroke="#81b29a" strokeLinecap="round" strokeWidth="5" opacity="0.7" />
            </svg>
          </motion.div>
        </div>

        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/45">Trip Activity</p>
          <h4 className="mt-1 text-lg font-bold text-primary">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-primary/60">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseEmptyState;
