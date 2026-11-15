import { findContact } from '../contacts/find.js';

/** What the screen shows when a call comes in: the caller's name if we know the number. */
export function callerLabel(contacts, phone) {
  return findContact(contacts, phone)?.name ?? phone;
}
