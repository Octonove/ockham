/** A phone as it is stored and compared: digits only, with its leading + if it has one. */
export function normalizePhone(phone) {
  const text = String(phone).trim();
  return (text.startsWith('+') ? '+' : '') + text.replace(/\D/g, '');
}
