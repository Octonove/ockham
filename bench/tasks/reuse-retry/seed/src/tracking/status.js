import { getJson } from '../net/http.js';
import { withRetry } from '../net/retry.js';

/** Where a parcel is, from the carrier's API. */
export function parcelStatus(code, fetchImpl) {
  return withRetry(() => getJson(`https://carrier.example/parcels/${encodeURIComponent(code)}`, fetchImpl));
}
