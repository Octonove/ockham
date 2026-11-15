// order: { total } in cents
// discount: { type: 'percent' | 'fixed', value, expires } or nothing; expires is a 'YYYY-MM-DD' date or nothing
// today: a 'YYYY-MM-DD' date
export function applyDiscount(order, discount, today) {
  const { total } = order;
  if (discount == null || (discount.expires != null && today > discount.expires)) return total;
  if (discount.type === 'percent') {
    // A percentage outside 0-100 would give money away or add a surcharge.
    const percent = Math.min(100, Math.max(0, discount.value));
    return total - Math.round(total * percent / 100);
  }
  if (discount.type === 'fixed') return Math.max(0, total - Math.max(0, discount.value));
  return total;
}
