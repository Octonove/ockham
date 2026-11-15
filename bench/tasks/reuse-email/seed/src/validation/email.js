/**
 * Is this something we can send mail to? Checked the same way everywhere: spaces
 * around it do not count, there is exactly one @, something before it, and a domain
 * with a dot. Loose about the rest on purpose: the real test is the confirmation mail.
 */
export function isEmail(text) {
  const value = String(text ?? '').trim();
  if (value.length > 254 || /\s/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && /^[^.]+(\.[^.]+)+$/.test(domain);
}

/** The form an address is stored in: no spaces around it, domain in lower case. */
export function normalizeEmail(text) {
  const [local, domain] = String(text).trim().split('@');
  return `${local}@${domain.toLowerCase()}`;
}
