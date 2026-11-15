/** The page numbers shown under the list of members. */
export function pageNumbers(total) {
  const pages = Math.ceil(total / 20);
  return Array.from({ length: pages }, (_, index) => index + 1);
}
