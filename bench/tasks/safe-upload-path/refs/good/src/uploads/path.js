import path from 'node:path';

/**
 * Where an uploaded file is stored.
 * @param {string} baseDir  the uploads folder
 * @param {string} filename the name the user's browser sent
 * @returns {string}
 */
export function uploadPath(baseDir, filename) {
  const base = path.resolve(baseDir);
  const full = path.resolve(base, filename);
  if (!full.startsWith(base + path.sep)) throw new Error('file name leaves the uploads folder');
  return full;
}
