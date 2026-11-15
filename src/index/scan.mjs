// Which files of a project are worth indexing.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SOURCE = /\.(?:m?js|cjs|jsx|ts|mts|cts|tsx)$/;
const NOT_SOURCE = /\.d\.[cm]?ts$|\.min\.[cm]?js$|\.bundle\.js$/;
const TEST = /(?:^|\/)(?:tests?|__tests__|__mocks__|spec|specs|e2e|fixtures)\/|\.(?:test|spec)\.[^./]+$/;
// Folders that hold what was installed or built, not what was written.
const SKIP = new Set(['node_modules', 'bower_components', 'vendor', 'dist', 'build', 'out', 'coverage', 'target', 'tmp', 'temp']);

/** @param {string} rel  a path with forward slashes */
export const isTest = (rel) => TEST.test(rel);

/**
 * The source files under `root`, as paths from it with forward slashes, in a fixed order.
 * Folders whose name starts with a dot are left out, and so are links: a link can lead
 * back to where the walk came from.
 * @param {string} root
 * @param {{ maxFiles?: number }} [limits]
 * @returns {{ files: string[], truncated: boolean }}
 */
export function sourceFiles(root, { maxFiles = 20_000 } = {}) {
  /** @type {string[]} */
  const files = [];
  const pending = [''];
  while (pending.length) {
    const dir = /** @type {string} */ (pending.pop());
    let entries;
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      continue;                                               // a folder that cannot be read is not ours to index
    }
    for (const entry of entries) {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !SKIP.has(entry.name)) pending.push(rel);
      } else if (entry.isFile() && SOURCE.test(entry.name) && !NOT_SOURCE.test(entry.name)) {
        files.push(rel);
        if (files.length >= maxFiles) return { files: files.sort(), truncated: true };
      }
    }
  }
  return { files: files.sort(), truncated: false };
}
