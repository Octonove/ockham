/** The term as a pattern that matches exactly those characters. */
const literal = (term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A line of a search result with what the customer searched for marked in it. */
export function highlight(text, term) {
  if (!term) return text;
  return text.replace(new RegExp(literal(term), 'gi'), (found) => `<mark>${found}</mark>`);
}
