import { renderComment } from '../comments/render.js';

/** The comments of a thread, as the HTML the page puts inside its <ul>. */
export function renderThread(comments) {
  return comments.map(renderComment).join('\n');
}
