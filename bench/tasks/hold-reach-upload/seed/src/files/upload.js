const MAX_BYTES = 5 * 1024 * 1024;

/** Accept an uploaded file or say why not: { ok: true } or { ok: false, error }. */
export function acceptUpload(file) {
  if (file.size > MAX_BYTES) return { ok: false, error: 'The file is larger than 5 MB.' };
  return { ok: true };
}
