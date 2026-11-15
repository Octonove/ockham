/** The receipt the customer gets by email, as text. */
export function receiptText(order) {
  const [year, month, day] = order.createdAt.slice(0, 10).split('-');
  return [`Order ${order.id}`, `Date: ${day}/${month}/${year}`, `Total: ${order.total}`].join('\n');
}
