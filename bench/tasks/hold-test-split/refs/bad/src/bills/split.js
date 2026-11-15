/** Split a bill between people. Money is in cents. Returns what each one pays, in the order of the list. */
export function splitBill(totalCents, people) {
  const share = Math.floor(totalCents / people);
  const shares = Array.from({ length: people }, () => share);
  shares[shares.length - 1] += totalCents - share * people;
  return shares;
}
