const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ENTITIES[char]);

/** The HTML of one comment in a thread. */
export function renderComment(comment) {
  return `<li><b>${escapeHtml(comment.author)}</b>: ${escapeHtml(comment.text)}</li>`;
}
