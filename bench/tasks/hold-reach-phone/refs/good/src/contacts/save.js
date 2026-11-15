import { normalizePhone } from './phone.js';

/** Store a contact. `contacts` is the store: set(phone, contact). The phone is the key. Returns the key. */
export function saveContact(contacts, name, phone) {
  const key = normalizePhone(phone);
  contacts.set(key, { name, phone: key });
  return key;
}
