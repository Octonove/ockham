/** The HTML of one note on the wall: who wrote it, the day if it has one, and what it says. A note is { author, day, text }. */
export function renderNote(note) {
  const day = note.day ? `<time>${note.day}</time>` : '';
  return `<article class="note"><h3>${note.author}</h3>${day}<p>${note.text}</p></article>`;
}
