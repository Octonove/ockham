/** Read the labels file: the texts of the shop, which the translators edit by hand, one label per line. */
export function parseLabels(text) {
  return Object.fromEntries(text.split('\n').map((line) => line.split('=').map((part) => part.trim())));
}
