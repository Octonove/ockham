/** Take a voucher at checkout. `today` and `voucher.expires` are 'YYYY-MM-DD' dates. */
export function redeemVoucher(voucher, order, today) {
  if (!voucher || voucher.used) return { ok: false, error: 'unknown' };
  if (today >= voucher.expires) return { ok: false, error: 'expired' };
  return { ok: true, total: Math.max(0, order.total - voucher.amount) };
}
