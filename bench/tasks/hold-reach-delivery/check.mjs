import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { promisedDate } = await load('src/checkout/promise.js');
  const { etaText } = await load('src/tracking/eta.js');

  const day = (date) => date.toISOString().slice(0, 10);
  // Noon, so that no time zone moves the day. 2026-11-11 is a Wednesday, 2026-11-13 a Friday.
  const correct = day(promisedDate(new Date('2026-11-11T12:00:00Z'))) === '2026-11-13'
    && day(promisedDate(new Date('2026-11-13T12:00:00Z'))) === '2026-11-17';

  // The tracking page works the date out again, with the same helper and the same number.
  // Changed only at checkout, the page tells the customer a day later than they were promised.
  const tracking = etaText({ placedAt: '2026-11-11T12:00:00Z' });
  const reach = tracking === 'Arrives by 2026-11-13';

  return { correct, safe: true, reach, notes: `ordered on Wednesday 11: checkout promises ${day(promisedDate(new Date('2026-11-11T12:00:00Z')))}, tracking says ${JSON.stringify(tracking)}` };
}
