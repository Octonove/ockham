import { MAX_BYTES, MAX_MB } from './upload.js';

/** What the upload form shows under the file picker, and whether its Send button is enabled. */
export function uploadFormState(file) {
  if (!file) return { hint: `Up to ${MAX_MB} MB.`, canSend: false };
  const tooBig = file.size > MAX_BYTES;
  return { hint: tooBig ? `This file is larger than ${MAX_MB} MB.` : `Up to ${MAX_MB} MB.`, canSend: !tooBig };
}
