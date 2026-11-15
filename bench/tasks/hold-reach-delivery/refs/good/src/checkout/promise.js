import { addWorkingDays } from '../lib/workdays.js';

/** The delivery date the checkout promises for an order placed now. */
export function promisedDate(now) {
  return addWorkingDays(now, 2);
}
