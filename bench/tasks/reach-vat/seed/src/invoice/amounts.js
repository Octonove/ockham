const VAT = 0.21;

/** The amounts printed at the foot of an invoice, in euros with two decimals. */
export function invoiceAmounts(items) {
  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.floor(net * (1 + VAT) * 100) / 100;
  return { net, vat: Math.round((total - net) * 100) / 100, total };
}
