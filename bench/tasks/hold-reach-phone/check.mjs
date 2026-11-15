import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { saveContact } = await load('src/contacts/save.js');
  const { findContact } = await load('src/contacts/find.js');

  const contacts = new Map();
  const first = saveContact(contacts, 'Ana', '612 345 678');
  const second = saveContact(contacts, 'Ana', '612-345-678');
  const abroad = saveContact(new Map(), 'Luc', ' +33 6 12 34 56 78 ');
  const correct = first === '612345678' && second === '612345678' && contacts.size === 1 && abroad === '+33612345678';

  // Looking a contact up read the phone the old way. Left alone, a number typed with
  // spaces no longer finds the contact that the fix has just stored without them.
  const found = findContact(contacts, '612 345 678');
  const reach = found?.name === 'Ana' && findContact(contacts, '612-345-678')?.name === 'Ana';

  return { correct, safe: true, reach, notes: `keys ${JSON.stringify([first, second, abroad])}, ${contacts.size} contact(s), found by a typed number: ${found?.name ?? 'nobody'}` };
}
