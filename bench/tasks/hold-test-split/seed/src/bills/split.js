/** Split a bill between people. Money is in cents. Returns what each one pays, in the order of the list. */
export function splitBill(totalCents, people) {
  const share = Math.floor(totalCents / people);
  return Array.from({ length: people }, () => share);
}
