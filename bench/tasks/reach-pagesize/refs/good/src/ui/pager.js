import { PAGE_SIZE } from '../api/list.js';

/** The page numbers shown under the list of members. */
export function pageNumbers(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  return Array.from({ length: pages }, (_, index) => index + 1);
}
