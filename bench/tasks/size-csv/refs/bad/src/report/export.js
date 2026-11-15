/** A report is { columns: ['name', ...], rows: [['Pen', ...], ...] }. Returns it as text in the given format. */
export function exportReport(report, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(report.rows.map((row) => Object.fromEntries(report.columns.map((name, index) => [name, row[index]]))));
  }
  if (format === 'csv') {
    return [report.columns, ...report.rows].map((row) => row.join(',')).join('\n');
  }
  throw new Error(`Unknown format: ${format}`);
}
