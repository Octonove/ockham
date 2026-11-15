// What Ockham says when a session starts.
// Until the rules exist (they are written against the benchmark, phase 2) the only
// thing it can say is the canary of the contract test.

const CANARY = /^[A-Za-z0-9-]{1,40}$/;

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string} the text for the model; empty means say nothing
 */
export function sessionContext(env) {
  const canary = String(env.OCKHAM_CANARY || '').trim();
  // The contract test sets a canary word and asks the model for it: the only proof
  // that a host really delivered this hook's output to the model.
  if (CANARY.test(canary)) return `Ockham contract test. The canary word is ${canary}.`;
  return '';
}
