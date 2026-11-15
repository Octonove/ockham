/** A voucher as the customer's wallet shows it, with whether it can still be used. */
export function walletEntry(voucher, today) {
  if (voucher.used) return { code: voucher.code, state: 'used' };
  if (today >= voucher.expires) return { code: voucher.code, state: 'expired' };
  return { code: voucher.code, state: 'ready', amount: voucher.amount };
}
