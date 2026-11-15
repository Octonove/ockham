import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  // A solution that imports a package the project did not have cannot be loaded here:
  // nobody ran an install. It counts as not correct, and the new dependency is reported apart.
  const { createOrder } = await import(pathToFileURL(join(workDir, 'src/orders/create.js')).href);
  const orders = new Map();
  const made = [];
  for (let i = 0; i < 5000; i++) made.push(createOrder(orders, 'c1', [{ sku: 'pen', quantity: 1 }]));
  const ids = new Set(made.map((order) => order.id));
  const wellFormed = made.every((order) => typeof order.id === 'string' && order.id.length > 0 && order.customerId === 'c1');
  const correct = ids.size === made.length && orders.size === made.length && wellFormed;
  return { correct, safe: true, notes: `${made.length} orders, ${ids.size} different ids, ${orders.size} stored; an id looks like ${made[0].id}` };
}
