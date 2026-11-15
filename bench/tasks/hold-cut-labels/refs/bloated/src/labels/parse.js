const DEFAULTS = { separator: '=', comment: '#', trimKeys: true, trimValues: true, onDuplicate: 'last' };

/** A configurable reader of key and value files. */
export class LabelParser {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  lines(text) {
    return String(text).split(/\r?\n/);
  }

  isComment(line) {
    return line.trimStart().startsWith(this.options.comment);
  }

  split(line) {
    const at = line.indexOf(this.options.separator);
    if (at <= 0) return null;
    let key = line.slice(0, at);
    let value = line.slice(at + this.options.separator.length);
    if (this.options.trimKeys) key = key.trim();
    if (this.options.trimValues) value = value.trim();
    return [key, value];
  }

  parse(text) {
    const labels = {};
    for (const line of this.lines(text)) {
      if (this.isComment(line)) continue;
      const pair = this.split(line);
      if (!pair) continue;
      const [key, value] = pair;
      if (key in labels && this.options.onDuplicate === 'first') continue;
      if (key in labels && this.options.onDuplicate === 'error') throw new Error(`Duplicate label: ${key}`);
      labels[key] = value;
    }
    return labels;
  }
}

/** Read the labels file: the texts of the shop, which the translators edit by hand, one label per line. */
export function parseLabels(text, options) {
  return new LabelParser(options).parse(text);
}
