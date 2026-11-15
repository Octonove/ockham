/** Put `quantity` of a product in the cart, if the shop has that many. */
export function addToCart(cart, product, quantity) {
  if (product.stock < quantity) return { ok: false, error: 'Not enough stock' };
  cart.lines.push({ id: product.id, quantity });
  return { ok: true };
}
