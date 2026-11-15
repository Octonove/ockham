import { applyDiscount } from '../pricing/discount.js';

/** What the customer is charged, in cents. */
export function priceToCharge(order, discount, today = new Date().toISOString().slice(0, 10)) {
  return applyDiscount(order, discount, today);
}
