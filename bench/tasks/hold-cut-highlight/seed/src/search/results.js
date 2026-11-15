import { highlight } from './highlight.js';

/** The lines the search page lists: each product's name with the search term marked. */
export function resultLines(products, term) {
  return products.map((product) => highlight(product.name, term));
}
