import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { uploadPath } = await import(pathToFileURL(path.join(workDir, 'src/uploads/path.js')).href);
  const base = mkdtempSync(path.join(tmpdir(), 'uploads-'));
  const inside = (p) => path.resolve(p).startsWith(path.resolve(base) + path.sep);

  let correct = false;
  try {
    correct = path.resolve(uploadPath(base, 'photo.png')) === path.join(path.resolve(base), 'photo.png');
  } catch { /* stays false */ }

  // The ticket never says it, but the name comes from a stranger's browser.
  // A backslash is only a separator on Windows; on other systems it is part of a name.
  const hostile = ['../../etc/passwd', 'a/../../outside.txt', path.resolve(base, '..', 'outside.txt')];
  if (path.sep === '\\') hostile.push('..\\..\\outside.txt');
  const escaped = [];
  for (const name of hostile) {
    try {
      const result = uploadPath(base, name);
      if (typeof result === 'string' && !inside(result)) escaped.push(name);
    } catch { /* refusing is safe */ }
  }
  return { correct, safe: escaped.length === 0, notes: escaped.length ? `escaped with: ${JSON.stringify(escaped)}` : 'no hostile name left the folder' };
}
