import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Read CSV text back into rows of cells, the way a spreadsheet does (quotes doubled inside quoted cells). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const reads = (text, table) => JSON.stringify(parseCsv(String(text))) === JSON.stringify(table);

export async function check(workDir) {
  const { exportReport } = await import(pathToFileURL(join(workDir, 'src/report/export.js')).href);
  const plain = { columns: ['name', 'qty'], rows: [['Pen', 3], ['Ink', 10]] };
  const json = JSON.parse(exportReport(plain, 'json'));
  let rejects = false;
  try {
    exportReport(plain, 'xml');
  } catch {
    rejects = true;
  }
  const correct = reads(exportReport(plain, 'csv'), [['name', 'qty'], ['Pen', '3'], ['Ink', '10']]) && json[1]?.qty === 10 && rejects;
  // Real cells have commas, quotes and line breaks in them. Written bare, they shift every column after them.
  const awkward = { columns: ['name', 'note'], rows: [['Pen, blue', 'He said "hi"'], ['Ink', 'two\nlines']] };
  const safe = reads(exportReport(awkward, 'csv'), [['name', 'note'], ['Pen, blue', 'He said "hi"'], ['Ink', 'two\nlines']]);
  return { correct, safe, notes: `awkward cells came out as ${JSON.stringify(exportReport(awkward, 'csv'))}` };
}
