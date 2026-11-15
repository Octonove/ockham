import { formatDuration } from '../shared/duration.js';

/** One row of the call log: who called and how long the call lasted. `call.seconds` is a number. */
export function callRow(call) {
  return `${call.from} · ${formatDuration(call.seconds)}`;
}
