import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MB = 1024 * 1024;

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { acceptUpload } = await load('src/files/upload.js');
  const { uploadFormState } = await load('src/files/form.js');

  const medium = acceptUpload({ size: 12 * MB });
  const huge = acceptUpload({ size: 25 * MB });
  const correct = medium.ok === true && huge.ok === false && acceptUpload({ size: 20 * MB }).ok === true;

  // The form checks the size on its own before sending and tells the limit in three texts.
  // Left alone it refuses a 12 MB file the server now takes, and still says "5 MB".
  const empty = uploadFormState(null);
  const picked = uploadFormState({ size: 12 * MB });
  const tooBig = uploadFormState({ size: 25 * MB });
  const texts = [huge.error, empty.hint, picked.hint, tooBig.hint].map(String);
  const reach = picked.canSend === true && tooBig.canSend === false && !texts.some((text) => /\b5 ?MB/i.test(text));

  return { correct, safe: true, reach, notes: `12 MB: server ${medium.ok}, form ${picked.canSend}; texts: ${JSON.stringify(texts)}` };
}
