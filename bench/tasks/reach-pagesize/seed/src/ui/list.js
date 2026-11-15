import { listMembers } from '../api/list.js';
import { pageNumbers } from './pager.js';

/** What the members page needs to draw itself. */
export function membersPage(members, page) {
  const { items, total } = listMembers(members, page);
  return { names: items.map((member) => member.name), pages: pageNumbers(total), current: page };
}
