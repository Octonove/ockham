import { escapeNote } from './escape.js';

/** The HTML of one note on the wall: who wrote it, the day if it has one, and what it says. A note is { author, day, text }. */
export function renderNote(note) {
  var html = '';
  html = html + '<article class="note">';
  html = html + '<h3>' + escapeNote(note.author) + '</h3>';
  if (note.day) {
    html = html + '<time>' + escapeNote(note.day) + '</time>';
  }
  html = html + '<p>' + escapeNote(note.text) + '</p>';
  html = html + '</article>';
  return html;
}
