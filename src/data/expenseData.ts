import type { ExpenseCategory } from '../types/dashboard';

export const expenseCategories: ExpenseCategory[] = ['Transport', 'Stay', 'Food', 'Tickets'];

export const initialCosts: Record<ExpenseCategory, number> = {
  Transport: 220,
  Stay: 960,
  Food: 320,
  Tickets: 180,
};
