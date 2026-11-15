/** What the product page says under the quantity picker, for the quantity chosen. */
export function stockNote(product, quantity) {
  return product.stock < quantity ? 'Not enough stock' : 'In stock';
}
