export const MAX_MB = 20;
export const MAX_BYTES = MAX_MB * 1024 * 1024;

/** Accept an uploaded file or say why not: { ok: true } or { ok: false, error }. */
export function acceptUpload(file) {
  if (file.size > MAX_BYTES) return { ok: false, error: `The file is larger than ${MAX_MB} MB.` };
  return { ok: true };
}
