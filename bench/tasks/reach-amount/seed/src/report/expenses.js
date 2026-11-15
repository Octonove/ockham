import { parseAmount } from '../lib/amount.js';

/** Expenses added up per category, from the rows of the expenses sheet. */
export function expensesByCategory(rows) {
  const totals = {};
  for (const row of rows) {
    totals[row.category] = (totals[row.category] || 0) + parseAmount(row.amount);
  }
  return totals;
}
