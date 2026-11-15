/** One line of a quote for a business customer: the unit price after the discount agreed with them, and the total. Cents. */
export function quoteLine(unitCents, quantity, agreedPercent) {
  const unit = unitCents - Math.round(unitCents * agreedPercent / 100);
  return { unit, total: unit * quantity };
}
