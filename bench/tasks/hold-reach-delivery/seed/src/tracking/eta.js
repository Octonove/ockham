import { addWorkingDays } from '../lib/workdays.js';

/** What the tracking page says about when a parcel will arrive. `order.placedAt` is an ISO string. */
export function etaText(order) {
  const due = addWorkingDays(new Date(order.placedAt), 3);
  return `Arrives by ${due.toISOString().slice(0, 10)}`;
}
