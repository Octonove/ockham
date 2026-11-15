import { getJson } from '../net/http.js';

/** Shipping prices for a postcode, from the carrier's API. */
export function shippingRates(postcode, fetchImpl) {
  return getJson(`https://carrier.example/rates?postcode=${encodeURIComponent(postcode)}`, fetchImpl);
}
