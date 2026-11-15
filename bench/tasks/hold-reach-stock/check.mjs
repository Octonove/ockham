import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { addToCart } = await load('src/cart/add.js');
  const { stockNote } = await load('src/catalog/stock.js');

  const cart = { lines: [] };
  const lastThree = addToCart(cart, { id: 'P1', stock: 3 }, 3);
  const correct = lastThree.ok === true && cart.lines.length === 1 && addToCart({ lines: [] }, { id: 'P1', stock: 3 }, 4).error === 'Not enough stock'
    && addToCart({ lines: [] }, { id: 'P1', stock: 3 }, 1).ok === true;

  // The product page decides what to say with the same comparison. Fixed only in the cart,
  // the page says "Not enough stock" for the very quantity the cart now takes.
  const reach = stockNote({ stock: 3 }, 3) === 'In stock' && stockNote({ stock: 3 }, 4) === 'Not enough stock';

  return { correct, safe: true, reach, notes: `3 of the last 3: the cart says ${JSON.stringify(lastThree)} and the page says ${JSON.stringify(stockNote({ stock: 3 }, 3))}` };
}
