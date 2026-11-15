/** The price of an item during a promotion, in cents. `percent` is the discount: 15 means 15 % off. */
export function promoPrice(cents, percent) {
  return cents - Math.round(cents * percent / 100);
}
