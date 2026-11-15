import { getJson } from '../net/http.js';
import { withRetry } from '../net/retry.js';

/** Shipping prices for a postcode, from the carrier's API. */
export function shippingRates(postcode, fetchImpl) {
  return withRetry(() => getJson(`https://carrier.example/rates?postcode=${encodeURIComponent(postcode)}`, fetchImpl));
}
