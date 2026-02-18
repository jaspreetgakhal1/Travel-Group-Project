import React, { useMemo, useState } from 'react';
import { expenseCategories, initialCosts } from '../data/expenseData';
import type { ExpenseCategory } from '../types/dashboard';

const ExpenseTracker: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory>('Transport');
  const [costs, setCosts] = useState<Record<ExpenseCategory, number>>(initialCosts);

  const handleCostChange = (category: ExpenseCategory, value: string) => {
    const parsed = Number(value);
    const numericValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    setCosts((previous) => ({
      ...previous,
      [category]: numericValue,
    }));
  };

  const totalSharedCost = useMemo(
    () => expenseCategories.reduce((total, category) => total + costs[category], 0),
    [costs],
  );

  return (
    <section className="rounded-card bg-white p-5 shadow-sm ring-1 ring-primary/10">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Expense Tracker</p>
        <h3 className="text-lg font-semibold text-primary">Split Costs With Your Group</h3>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {expenseCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={
              activeCategory === category
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-background'
                : 'rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20'
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {expenseCategories.map((category) => (
          <label
            key={category}
            className={
              activeCategory === category
                ? 'block rounded-card border border-accent/40 bg-accent/10 p-3'
                : 'block rounded-card border border-primary/10 bg-background p-3'
            }
          >
            <span className="mb-2 block text-sm font-medium text-primary">{category}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={costs[category]}
              onChange={(event) => handleCostChange(category, event.target.value)}
              className="w-full rounded-card border border-primary/20 bg-white px-3 py-2 text-sm text-primary outline-none ring-accent/40 transition focus:ring-2"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-card bg-primary p-4 text-background">
        <p className="text-xs font-semibold uppercase tracking-wide text-background/80">Total Shared Cost</p>
        <p className="mt-1 text-2xl font-bold">${totalSharedCost.toFixed(2)}</p>
        <button
          type="button"
          className="mt-3 w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Pay via Escrow
        </button>
      </div>
    </section>
  );
};

export default ExpenseTracker;
