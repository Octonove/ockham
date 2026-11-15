import { formatDate } from '../shared/dates.js';

/** The lines of a customer's order history, newest first. */
export function orderHistory(orders) {
  return [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => `${formatDate(order.createdAt)}  ${order.id}`);
}
