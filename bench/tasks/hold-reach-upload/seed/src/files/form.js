/** What the upload form shows under the file picker, and whether its Send button is enabled. */
export function uploadFormState(file) {
  if (!file) return { hint: 'Up to 5 MB.', canSend: false };
  const tooBig = file.size > 5 * 1024 * 1024;
  return { hint: tooBig ? 'This file is larger than 5 MB.' : 'Up to 5 MB.', canSend: !tooBig };
}
