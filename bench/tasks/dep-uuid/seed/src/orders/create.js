/** A new order for a customer. `orders` is the store: set(id, order). */
export function createOrder(orders, customerId, items) {
  const order = { id: String(Date.now()), customerId, items, createdAt: new Date().toISOString() };
  orders.set(order.id, order);
  return order;
}
