/** The receipt the customer gets by email, as text. */
export function receiptText(order) {
  return [`Order ${order.id}`, `Total: ${order.total}`].join('\n');
}
