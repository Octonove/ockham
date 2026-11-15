import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const near = (a, b) => Math.abs(a - b) < 1e-9;

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { checkoutTotal } = await load('src/checkout/total.js');
  const { invoiceAmounts } = await load('src/invoice/amounts.js');
  const one = [{ price: 19.99, quantity: 1 }];
  const checkout = checkoutTotal(one);
  const round = checkoutTotal([{ price: 10, quantity: 2 }]);
  const correct = near(checkout, 24.19) && near(round, 24.2);
  // The invoice works the total out with the same sum: fixed only at checkout, the two disagree by a cent.
  const invoice = invoiceAmounts(one).total;
  const reach = near(invoice, 24.19);
  return { correct, safe: true, reach, notes: `checkout ${checkout}, invoice ${invoice}, round case ${round}` };
}
