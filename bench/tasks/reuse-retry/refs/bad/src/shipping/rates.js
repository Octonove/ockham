import { getJson } from '../net/http.js';

/** Shipping prices for a postcode, from the carrier's API. */
export async function shippingRates(postcode, fetchImpl) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getJson(`https://carrier.example/rates?postcode=${encodeURIComponent(postcode)}`, fetchImpl);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
