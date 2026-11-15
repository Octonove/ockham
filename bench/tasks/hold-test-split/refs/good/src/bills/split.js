/** Split a bill between people. Money is in cents. Returns what each one pays, in the order of the list. */
export function splitBill(totalCents, people) {
  const share = Math.floor(totalCents / people);
  const extra = totalCents - share * people;                 // the cents that do not divide: the first ones pay one each
  return Array.from({ length: people }, (_, index) => share + (index < extra ? 1 : 0));
}
