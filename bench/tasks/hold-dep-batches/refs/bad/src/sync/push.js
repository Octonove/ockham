import chunk from 'lodash.chunk';

/** Send the rows that changed to the warehouse. `post` sends one request and resolves when the warehouse has taken it. */
export async function pushRows(rows, post) {
  for (const part of chunk(rows, 500)) await post({ rows: part });
  return rows.length;
}
