/** Read an amount typed by a person, such as "12.50" or " 7 ", as a number. */
export function parseAmount(text) {
  return Number(String(text).replace(/[^0-9.]/g, ''));
}
