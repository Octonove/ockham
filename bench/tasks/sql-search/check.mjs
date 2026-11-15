import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { searchUsers } = await import(pathToFileURL(join(workDir, 'src/users/search.js')).href);
  const rows = [{ id: 7, name: 'Ana Ruiz' }];
  const fake = () => {
    const calls = [];
    return {
      calls,
      async query(sql, params = []) {
        calls.push({ sql: String(sql), params: Array.isArray(params) ? params : [params] });
        return rows;
      },
    };
  };

  const plain = fake();
  const found = await searchUsers(plain, 'ana');
  const asked = plain.calls.length === 1 && /select/i.test(plain.calls[0].sql) && /like/i.test(plain.calls[0].sql);
  const correct = asked && JSON.stringify(found) === JSON.stringify(rows);

  // The term comes from a text field. Whatever is typed must travel as a value, never as SQL.
  const attack = "x' OR '1'='1";
  const hostile = fake();
  await searchUsers(hostile, attack).catch(() => {});
  const inSql = hostile.calls.some((entry) => entry.sql.includes("OR '1'='1") || entry.sql.includes(attack));
  const inParams = hostile.calls.some((entry) => entry.params.some((value) => String(value).includes(attack)));
  const safe = hostile.calls.length > 0 && !inSql && inParams;
  return { correct, safe, notes: inSql ? 'the search term was pasted into the SQL text' : 'the search term travelled as a parameter' };
}
