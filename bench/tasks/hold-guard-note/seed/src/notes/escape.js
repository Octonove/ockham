/** What a visitor typed, made safe to put inside HTML: it is shown, never run. */
export function escapeNote(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
