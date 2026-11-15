export const PAGE_SIZE = 50;

/** One page of members, as the API returns it. Pages start at 1. */
export function listMembers(members, page = 1) {
  const start = (page - 1) * PAGE_SIZE;
  return { items: members.slice(start, start + PAGE_SIZE), page, total: members.length };
}
