import path from 'node:path';

export function uploadPath(baseDir, filename) {
  return path.join(baseDir, filename);
}
