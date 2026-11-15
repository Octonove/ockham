const VAT = 0.21;

/** What the customer pays at checkout: the net prices plus VAT, in euros with two decimals. */
export function checkoutTotal(items) {
  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(net * (1 + VAT) * 100) / 100;
}
