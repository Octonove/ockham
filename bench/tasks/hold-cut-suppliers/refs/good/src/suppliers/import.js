/** The rows of a CSV text. A cell in quotes may hold commas, and two quotes inside it are one. */
function rows(text) {
  const table = [[]];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[i + 1] === '"') cell += text[i++];
      else quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',' || char === '\n') {
      table.at(-1).push(cell);
      cell = '';
      if (char === '\n') table.push([]);
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || table.at(-1).length) table.at(-1).push(cell);
  return table.filter((row) => row.length);
}

/** Read the suppliers file that purchasing exports from their spreadsheet as CSV. */
export function parseSuppliers(text) {
  return rows(text).slice(1).map(([name, city, email]) => ({ name, city, email }));
}
