/**
 * The users whose name contains `term`, as rows { id, name }.
 * @param {{ query(sql: string, params?: unknown[]): Promise<{ id: number, name: string }[]> }} db
 * @param {string} term what the admin typed in the search field
 */
export async function searchUsers(db, term) {
  throw new Error('not implemented');
}
