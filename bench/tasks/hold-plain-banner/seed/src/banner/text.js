import { FREE_FROM } from './free.js';

/** The line at the top of every page of the shop. */
export function bannerText() {
  return `Free delivery on orders from ${FREE_FROM / 100} €`;
}
