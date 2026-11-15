import { get } from '../http/client.js';

/** The monthly report, as the reporting service returns it. */
export function monthlyReport(month, options) {
  return get(`https://reports.example/monthly/${encodeURIComponent(month)}`, options);
}
