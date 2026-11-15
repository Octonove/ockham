// order: { total } in cents
// discount: { type: 'percent' | 'fixed', value, expires } or nothing; expires is a 'YYYY-MM-DD' date or nothing
// today: a 'YYYY-MM-DD' date
export function applyDiscount(order, discount, today) {
  if (!discount || (discount.expires && today > discount.expires)) return order.total;
  if (discount.type === 'percent') return order.total - Math.round(order.total * discount.value / 100);
  if (discount.type === 'fixed') return order.total - discount.value;
  return order.total;
}
