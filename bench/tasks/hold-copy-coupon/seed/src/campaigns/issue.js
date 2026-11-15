/** Issue a coupon for a campaign. A code already in use is refused: two coupons must never answer to the same code. */
export function issueCoupon(coupons, code, percent) {
  if (coupons.find((coupon) => coupon.code === code.trim())) throw new Error(`The code ${code} is already in use.`);
  const coupon = { code: code.trim(), percent };
  coupons.push(coupon);
  return coupon;
}
