import { formatMoney } from '../shared/money.js';

/** An invoice as text: one line per item and the total at the end. */
export function invoiceText(invoice) {
  const lines = invoice.lines.map((line) => `${line.name}  ${formatMoney(line.cents)}`);
  const total = invoice.lines.reduce((sum, line) => sum + line.cents, 0);
  return [...lines, `Total  ${formatMoney(total)}`].join('\n');
}
