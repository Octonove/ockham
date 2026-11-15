const DEFAULTS = { delimiter: ',', quote: '"', header: true, skipEmpty: true, trim: false, columns: null };

/** A configurable CSV reader. */
export class CsvReader {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  rows(text) {
    const { delimiter, quote } = this.options;
    const table = [[]];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char !== quote) cell += char;
        else if (text[i + 1] === quote) cell += text[i++];
        else quoted = false;
      } else if (char === quote) {
        quoted = true;
      } else if (char === delimiter || char === '\n') {
        table.at(-1).push(this.clean(cell));
        cell = '';
        if (char === '\n') table.push([]);
      } else if (char !== '\r') {
        cell += char;
      }
    }
    if (cell || table.at(-1).length) table.at(-1).push(this.clean(cell));
    return this.options.skipEmpty ? table.filter((row) => row.length) : table;
  }

  clean(cell) {
    return this.options.trim ? cell.trim() : cell;
  }

  records(text) {
    const table = this.rows(text);
    const names = this.options.columns ?? (this.options.header ? table[0] : table[0].map((_, index) => `column${index + 1}`));
    const body = this.options.header ? table.slice(1) : table;
    return body.map((row) => Object.fromEntries(names.map((name, index) => [name, row[index] ?? ''])));
  }
}

/** Read the suppliers file that purchasing exports from their spreadsheet as CSV. */
export function parseSuppliers(text, options) {
  return new CsvReader(options).records(text);
}
