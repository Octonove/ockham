import { isEmail, normalizeEmail } from '../validation/email.js';

/** Add an address to the newsletter list. `list` is the store: has(email) and add(email). */
export function subscribe(list, email) {
  if (!isEmail(email)) throw new Error('That does not look like an email address.');
  const address = normalizeEmail(email);
  if (!list.has(address)) list.add(address);
}
