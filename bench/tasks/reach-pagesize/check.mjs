import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { listMembers } = await load('src/api/list.js');
  const { pageNumbers } = await load('src/ui/pager.js');
  const members = Array.from({ length: 120 }, (_, index) => ({ name: `member ${index + 1}` }));
  const first = listMembers(members, 1).items;
  const last = listMembers(members, 3).items;
  const correct = first.length === 50 && last.length === 20 && last[0]?.name === 'member 101';
  // The pager under the list counted pages with its own 20: left alone, it offers six pages and three are empty.
  const pages = pageNumbers(120);
  const reach = pages.length === 3;
  return { correct, safe: true, reach, notes: `first page ${first.length} members, third page ${last.length}, pager offers ${pages.length} pages` };
}
