import { normalizePhone } from './phone.js';

/** The contact with this phone, as the caller typed it, or undefined. `contacts` is the store: get(phone). */
export function findContact(contacts, phone) {
  return contacts.get(normalizePhone(phone));
}
