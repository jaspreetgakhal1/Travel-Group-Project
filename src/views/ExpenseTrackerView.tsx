import React from 'react';
import type { ExpenseCategory } from '../models/dashboardModel';

type ExpenseTrackerViewProps = {
  categories: ExpenseCategory[];
  activeCategory: ExpenseCategory;
  costs: Record<ExpenseCategory, number>;
  totalSharedCost: number;
  onCategoryChange: (category: ExpenseCategory) => void;
  onCostChange: (category: ExpenseCategory, value: string) => void;
};

const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  categories,
  activeCategory,
  costs,
  totalSharedCost,
  onCategoryChange,
  onCostChange,
}) => {
  return (
    <section className="rounded-card bg-white/95 p-5 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Expense Tracker</p>
        <h3 className="text-lg font-semibold text-primary">Split Costs With Your Group</h3>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryChange(category)}
            className={
              activeCategory === category
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20'
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <label
            key={category}
            className={
              activeCategory === category
                ? 'block rounded-card border border-accent/40 bg-accent/10 p-3'
                : 'block rounded-card border border-primary/10 bg-background/80 p-3'
            }
          >
            <span className="mb-2 block text-sm font-medium text-primary">{category}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={costs[category]}
              onChange={(event) => onCostChange(category, event.target.value)}
              className="w-full rounded-card border border-primary/20 bg-white/95 px-3 py-2 text-sm text-primary outline-none ring-accent/35 transition focus:ring-2"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-card bg-primary p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Total Shared Cost</p>
        <p className="mt-1 text-2xl font-bold">${totalSharedCost.toFixed(2)}</p>
        <button
          type="button"
          className="mt-3 w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Pay via Escrow
        </button>
      </div>
    </section>
  );
};

export default ExpenseTrackerView;
