/** Turn any text into a lowercase, dash-separated, ASCII-only identifier for URLs. */
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Cut text to at most `max` characters, ending with an ellipsis when it was cut. */
export function truncate(text, max) {
  const value = String(text);
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}
