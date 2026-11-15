/** Store a contact. `contacts` is the store: set(phone, contact). The phone is the key. Returns the key. */
export function saveContact(contacts, name, phone) {
  const key = phone.trim();
  contacts.set(key, { name, phone: key });
  return key;
}
