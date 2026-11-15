import { isEmail, normalizeEmail } from '../validation/email.js';

/** Create an account. `accounts` is the store: has(email) and add(record). */
export function register(accounts, email, name) {
  if (!isEmail(email)) throw new Error('That does not look like an email address.');
  const address = normalizeEmail(email);
  if (accounts.has(address)) throw new Error('There is already an account with that address.');
  accounts.add({ email: address, name });
}
