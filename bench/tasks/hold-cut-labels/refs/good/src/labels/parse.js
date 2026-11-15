/** Read the labels file: the texts of the shop, which the translators edit by hand, one label per line. */
export function parseLabels(text) {
  const labels = {};
  for (const line of text.split(/\r?\n/)) {
    const sign = line.indexOf('=');
    if (sign > 0) labels[line.slice(0, sign).trim()] = line.slice(sign + 1).trim();
  }
  return labels;
}
