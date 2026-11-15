/** Base class of everything that can write a report as text. */
class Exporter {
  constructor(options = {}) {
    this.options = options;
  }

  /** @returns {string} */
  export(report) {
    throw new Error(`${this.constructor.name} does not implement export()`);
  }
}

class JsonExporter extends Exporter {
  export(report) {
    return JSON.stringify(report.rows.map((row) => Object.fromEntries(report.columns.map((name, index) => [name, row[index]]))));
  }
}

class CsvExporter extends Exporter {
  get delimiter() {
    return this.options.delimiter ?? ',';
  }

  get lineBreak() {
    return this.options.lineBreak ?? '\n';
  }

  escape(value) {
    const text = String(value ?? '');
    const needsQuotes = text.includes(this.delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r');
    return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
  }

  line(cells) {
    return cells.map((cell) => this.escape(cell)).join(this.delimiter);
  }

  export(report) {
    return [report.columns, ...report.rows].map((row) => this.line(row)).join(this.lineBreak);
  }
}

class ExporterRegistry {
  constructor() {
    this.exporters = new Map();
  }

  register(format, exporter) {
    this.exporters.set(format, exporter);
    return this;
  }

  get(format) {
    const exporter = this.exporters.get(format);
    if (!exporter) throw new Error(`Unknown format: ${format}`);
    return exporter;
  }
}

const registry = new ExporterRegistry().register('json', new JsonExporter()).register('csv', new CsvExporter());

/** A report is { columns: ['name', ...], rows: [['Pen', ...], ...] }. Returns it as text in the given format. */
export function exportReport(report, format = 'json') {
  return registry.get(format).export(report);
}
