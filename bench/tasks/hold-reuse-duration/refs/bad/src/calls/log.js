/** One row of the call log: who called and how long the call lasted. `call.seconds` is a number. */
export function callRow(call) {
  const minutes = Math.floor(call.seconds / 60);
  const seconds = call.seconds % 60;
  return `${call.from} · ${minutes ? `${minutes} min ` : ''}${seconds} s`;
}
