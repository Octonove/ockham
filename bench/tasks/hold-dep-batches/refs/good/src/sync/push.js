/** Send the rows that changed to the warehouse. `post` sends one request and resolves when the warehouse has taken it. */
export async function pushRows(rows, post) {
  // The warehouse takes 500 rows in a request at the most.
  for (let at = 0; at < rows.length; at += 500) await post({ rows: rows.slice(at, at + 500) });
  return rows.length;
}
