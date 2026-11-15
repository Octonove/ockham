export async function searchUsers(db, term) {
  return db.query(`SELECT id, name FROM users WHERE name LIKE '%${term}%'`);
}
