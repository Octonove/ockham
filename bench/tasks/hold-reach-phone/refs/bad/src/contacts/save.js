/** Store a contact. `contacts` is the store: set(phone, contact). The phone is the key. Returns the key. */
export function saveContact(contacts, name, phone) {
  const text = phone.trim();
  const key = (text.startsWith('+') ? '+' : '') + text.replace(/\D/g, '');
  contacts.set(key, { name, phone: key });
  return key;
}
