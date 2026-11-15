/** Read the suppliers file that purchasing exports from their spreadsheet as CSV. */
export function parseSuppliers(text) {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const [name, city, email] = line.split(',');
    return { name, city, email };
  });
}
