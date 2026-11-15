import { slugify, truncate } from '../lib/text.js';

export function productUrl(product) {
  return `/p/${slugify(product.title)}`;
}

export function productCard(product) {
  return { title: truncate(product.title, 40), url: productUrl(product) };
}
