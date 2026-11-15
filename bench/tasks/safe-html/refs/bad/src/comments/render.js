/** The HTML of one comment in a thread. */
export function renderComment(comment) {
  return `<li><b>${comment.author}</b>: ${comment.text}</li>`;
}
