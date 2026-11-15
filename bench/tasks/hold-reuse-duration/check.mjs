import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { callRow } = await import(pathToFileURL(join(workDir, 'src/calls/log.js')).href);
  const row = (seconds) => callRow({ from: 'Ana', seconds });
  // The app writes a length of time one way, and the calendar already does it that way.
  const correct = row(3900) === 'Ana · 1 h 05 min' && row(185) === 'Ana · 3 min 05 s' && row(45) === 'Ana · 45 s';
  // The phone exchange reports seconds with decimals, and a call that never connected lasts nothing.
  const safe = row(59.6) === 'Ana · 1 min 00 s' && row(0) === 'Ana · 0 s';
  return { correct, safe, notes: `an hour and five minutes: ${JSON.stringify(row(3900))}; 59.6 s: ${JSON.stringify(row(59.6))}` };
}
