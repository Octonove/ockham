import { formatMoney } from '../shared/money.js';

/** What the cart page shows above the checkout button. */
export function cartSummary(cart) {
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const cents = cart.items.reduce((sum, item) => sum + item.cents * item.quantity, 0);
  return { count, total: formatMoney(cents) };
}
