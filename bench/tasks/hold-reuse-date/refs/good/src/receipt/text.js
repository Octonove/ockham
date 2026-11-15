import { formatDate } from '../shared/dates.js';

/** The receipt the customer gets by email, as text. */
export function receiptText(order) {
  return [`Order ${order.id}`, `Date: ${formatDate(order.createdAt)}`, `Total: ${order.total}`].join('\n');
}
