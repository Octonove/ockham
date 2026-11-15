import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { promoPrice } = await load('src/promo/price.js');
  const { quoteLine } = await load('src/quotes/line.js');

  const correct = promoPrice(999, 15) === 849 && promoPrice(1000, 15) === 850 && promoPrice(999, 0) === 999 && promoPrice(250, 50) === 125;

  // A quote takes the discount off with the same sum, written with its own names. Fixed
  // only in the promotion, the same item at the same discount has two prices.
  const quoted = quoteLine(999, 2, 15);
  const reach = quoted.unit === 849 && quoted.total === 1698 && quoteLine(1000, 1, 15).unit === 850;

  return { correct, safe: true, reach, notes: `9.99 with 15 % off: promotion ${promoPrice(999, 15)}, quote ${quoted.unit}` };
}
