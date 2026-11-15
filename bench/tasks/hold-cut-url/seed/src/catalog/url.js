/** The address of a page of the catalogue. `filters` may have `page` and `size`. */
export function catalogUrl(base, filters = {}) {
  const parts = [];
  if (filters.page) parts.push(`page=${filters.page}`);
  if (filters.size) parts.push(`size=${filters.size}`);
  return parts.length ? `${base}?${parts.join('&')}` : base;
}
