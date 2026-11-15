import { parsePage } from './page.js';

/** GET /members?page=2&size=20 : the query the database runs. `query` is the parsed query string. */
export function membersQuery(query) {
  const { offset, limit } = parsePage(query);
  return { text: 'SELECT id, name FROM members ORDER BY name LIMIT $1 OFFSET $2', values: [limit, offset] };
}
