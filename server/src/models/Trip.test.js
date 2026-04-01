import assert from 'node:assert/strict';
import { getTripExpectedBudgetDefault } from './Trip.js';

const fallbackBudget = getTripExpectedBudgetDefault(null);
assert.equal(fallbackBudget, 100);

const calculatedBudget = getTripExpectedBudgetDefault({
  startDate: new Date('2026-04-01T00:00:00.000Z'),
  endDate: new Date('2026-04-03T00:00:00.000Z'),
  maxParticipants: 4,
});

assert.equal(calculatedBudget, 1200);

console.log('Trip model regression tests passed.');
