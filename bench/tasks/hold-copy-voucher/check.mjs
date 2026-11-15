import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { redeemVoucher } = await load('src/vouchers/redeem.js');
  const { walletEntry } = await load('src/vouchers/wallet.js');
  const voucher = { code: 'SPRING', amount: 500, expires: '2026-04-30', used: false };
  const order = { total: 2000 };
  const correct = redeemVoucher(voucher, order, '2026-04-30').ok === true && redeemVoucher(voucher, order, '2026-04-30').total === 1500
    && redeemVoucher(voucher, order, '2026-05-01').error === 'expired' && redeemVoucher(voucher, order, '2026-04-01').ok === true
    && redeemVoucher({ ...voucher, used: true }, order, '2026-04-01').error === 'unknown';
  // The wallet tells the customer whether the voucher can be used, with a copy of the same line.
  // Fixed only at checkout, the wallet says "expired" of a voucher the checkout takes.
  const reach = walletEntry(voucher, '2026-04-30').state === 'ready' && walletEntry(voucher, '2026-05-01').state === 'expired';
  return { correct, safe: true, reach, notes: `on the day it expires, checkout says ${JSON.stringify(redeemVoucher(voucher, order, '2026-04-30'))} and the wallet says ${JSON.stringify(walletEntry(voucher, '2026-04-30'))}` };
}
