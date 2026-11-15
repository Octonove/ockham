/**
 * The letters shown in a person's circle when there is no photo: the first letter of the
 * name and of its last word, in capitals, so "ana maría lópez" is "AL" and "Lucía" is "L".
 * Spaces round and between the words do not count. No name at all gives "?".
 */
export function initials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (words[0][0] + last).toLocaleUpperCase('es-ES');
}
