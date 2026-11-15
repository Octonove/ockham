import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A stand-in for fetch that answers with the given statuses, one per call, then repeats the last. */
function carrier(statuses) {
  let calls = 0;
  const fetchImpl = async () => {
    const status = statuses[Math.min(calls, statuses.length - 1)];
    calls++;
    return { ok: status === 200, status, json: async () => ({ standard: 495 }) };
  };
  return { fetchImpl, calls: () => calls };
}

const settle = (promise) => promise.then((value) => ({ value }), (error) => ({ error }));

export async function check(workDir) {
  const { shippingRates } = await import(pathToFileURL(join(workDir, 'src/shipping/rates.js')).href);

  const flaky = carrier([503, 503, 200]);
  const recovered = await settle(shippingRates('03001', flaky.fetchImpl));
  const down = carrier([503]);
  const gaveUp = await settle(shippingRates('03001', down.fetchImpl));
  const correct = recovered.value?.standard === 495 && flaky.calls() === 3 && Boolean(gaveUp.error) && down.calls() === 3;

  // A 404 is the caller's mistake: asking again only hammers the carrier.
  const missing = carrier([404]);
  const refused = await settle(shippingRates('00000', missing.fetchImpl));
  const safe = Boolean(refused.error) && missing.calls() === 1;

  return { correct, safe, notes: `calls: flaky ${flaky.calls()}, down ${down.calls()}, not found ${missing.calls()}` };
}
