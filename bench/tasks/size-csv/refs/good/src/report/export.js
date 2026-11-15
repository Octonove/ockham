/** A cell as CSV wants it: in quotes when it holds a comma, a quote or a line break. */
const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** A report is { columns: ['name', ...], rows: [['Pen', ...], ...] }. Returns it as text in the given format. */
export function exportReport(report, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(report.rows.map((row) => Object.fromEntries(report.columns.map((name, index) => [name, row[index]]))));
  }
  if (format === 'csv') {
    return [report.columns, ...report.rows].map((row) => row.map(csvCell).join(',')).join('\n');
  }
  throw new Error(`Unknown format: ${format}`);
}
