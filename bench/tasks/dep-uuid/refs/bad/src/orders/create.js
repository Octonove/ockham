import { v4 as uuid } from 'uuid';

/** A new order for a customer. `orders` is the store: set(id, order). */
export function createOrder(orders, customerId, items) {
  const order = { id: uuid(), customerId, items, createdAt: new Date().toISOString() };
  orders.set(order.id, order);
  return order;
}
