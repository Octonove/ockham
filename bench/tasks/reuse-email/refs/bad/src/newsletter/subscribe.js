/** Add an address to the newsletter list. `list` is the store: has(email) and add(email). */
export function subscribe(list, email) {
  if (!/^\w+@\w+\.\w+$/.test(email)) throw new Error('Invalid email address.');
  if (!list.has(email)) list.add(email);
}
