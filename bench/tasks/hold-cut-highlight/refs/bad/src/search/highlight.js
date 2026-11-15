/** A line of a search result with what the customer searched for marked in it. */
export function highlight(text, term) {
  return text.replace(new RegExp(term, 'gi'), (found) => `<mark>${found}</mark>`);
}
