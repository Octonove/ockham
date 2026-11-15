const MAX_SIZE = 100;

/** A whole number above zero, or the fallback for anything else. */
function positiveInt(text, fallback) {
  const value = Number.parseInt(text, 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Which rows a request asks for: { offset, limit }. */
export function parsePage(query) {
  const page = positiveInt(query.page, 1);
  const limit = Math.min(positiveInt(query.size, 20), MAX_SIZE);
  return { offset: (page - 1) * limit, limit };
}
