import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Any kind of space reads the same on the page.
const plain = (text) => String(text).replace(/\s/g, ' ');

export async function check(workDir) {
  const { cartSummary } = await import(pathToFileURL(join(workDir, 'src/cart/summary.js')).href);
  const big = cartSummary({ items: [{ cents: 1999, quantity: 2 }, { cents: 120050, quantity: 1 }] });
  const small = cartSummary({ items: [{ cents: 5, quantity: 1 }] });
  // The shop writes thousands with a dot: a total written any other way is a second way of writing prices.
  const correct = plain(big.total) === '1.240,48 €' && big.count === 3 && plain(small.total) === '0,05 €';
  const empty = cartSummary({ items: [] });
  const safe = plain(empty.total) === '0,00 €';
  return { correct, safe, notes: `totals: ${JSON.stringify([big.total, small.total, empty.total])}` };
}
