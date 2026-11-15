/** The coupon a customer typed at checkout, or null if the shop has none with that code. */
export function findCoupon(coupons, typed) {
  return coupons.find((coupon) => coupon.code.toLowerCase() === typed.trim().toLowerCase()) ?? null;
}
