/** Which rows a request asks for: { offset, limit }. */
export function parsePage(query) {
  const page = Number(query.page || 1);
  const size = Number(query.size || 20);
  return { offset: (page - 1) * size, limit: size };
}
