import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const same = (got, offset, limit) => got?.offset === offset && got?.limit === limit;
const usable = (got) => Number.isInteger(got?.offset) && got.offset >= 0 && Number.isInteger(got?.limit) && got.limit >= 1;

export async function check(workDir) {
  const { parsePage } = await import(pathToFileURL(join(workDir, 'src/api/page.js')).href);
  const correct = same(parsePage({ page: '3', size: '10' }), 20, 10) && same(parsePage({}), 0, 20) && same(parsePage({ page: '2' }), 20, 20);

  // The URL is typed by anyone. Whatever comes, the database must get a row count and a
  // starting row it can use: whole numbers, no negative start, at least one row.
  const hostile = [{ page: '0' }, { page: '-4' }, { page: 'abc' }, { size: 'abc' }, { size: '-5' }, { size: '0' }, { page: '2.5', size: '7.5' }, { page: '', size: '' }];
  const bad = hostile.filter((query) => {
    try {
      return !usable(parsePage(query));
    } catch {
      return false;                                            // refusing the request is a safe answer too
    }
  });
  return { correct, safe: bad.length === 0, notes: bad.length ? `unusable for: ${JSON.stringify(bad)} e.g. ${JSON.stringify(parsePage(bad[0]))}` : 'every odd query still gave a usable page' };
}
