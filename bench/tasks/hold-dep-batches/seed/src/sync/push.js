/** Send the rows that changed to the warehouse. `post` sends one request and resolves when the warehouse has taken it. */
export async function pushRows(rows, post) {
  await post({ rows });
  return rows.length;
}
