import { parseAmount } from '../lib/amount.js';

/** The total of an invoice: the sum of the amounts of its lines. */
export function invoiceTotal(lines) {
  return lines.reduce((sum, line) => sum + parseAmount(String(line.amount).replace(',', '.')), 0);
}
