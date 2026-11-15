/** Orders from this amount up, in cents, are sent free. */
export const FREE_FROM = 4000;

/** Whether a basket is sent free. */
export function sentFree(basket) {
  return basket.total >= FREE_FROM;
}
