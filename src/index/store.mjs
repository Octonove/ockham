// The index of a project: what each of its source files defines and imports.
// It lives outside the project, in the user's cache folder, so that nothing appears
// in the repository and nothing has to be ignored by git. It is brought up to date
// by reading again only the files whose date or size changed.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, posix } from 'node:path';

import { namesIn } from './copies.mjs';
import { extract } from './extract.mjs';
import { isTest, sourceFiles } from './scan.mjs';

export const VERSION = 2;
const MAX_BYTES = 300_000;                                    // a source file larger than this was not written by hand
const TRY = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '/index.js', '/index.mjs', '/index.ts'];

/**
 * @typedef {object} FileEntry
 * @property {number} mtimeMs
 * @property {number} size
 * @property {boolean} test
 * @property {import('./extract.mjs').Sym[]} symbols
 * @property {string[]} imports   the project files this one imports, as paths from the root
 * @property {string[]} uses      the packages it imports, by name
 * @property {string[]} names     the names it uses, to tell which files can hold a copy of a line
 *
 * @typedef {object} Index
 * @property {number} version
 * @property {string} root
 * @property {boolean} complete   false while a first build is still running out of its time budget
 * @property {Record<string, FileEntry>} files
 */

/**
 * Where Ockham keeps what it works out. OCKHAM_CACHE_DIR moves it, which is how the
 * benchmark keeps its sessions out of the user's own folder.
 * @param {Record<string, string | undefined>} [env]
 */
export function cacheDir(env = process.env) {
  if (env.OCKHAM_CACHE_DIR) return env.OCKHAM_CACHE_DIR;
  if (process.platform === 'win32' && env.LOCALAPPDATA) return join(env.LOCALAPPDATA, 'ockham', 'cache');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Caches', 'ockham');
  return join(env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'ockham');
}

/**
 * @param {string} root
 * @param {Record<string, string | undefined>} [env]
 */
export function indexPath(root, env = process.env) {
  let real = root;
  try {
    real = realpathSync(root);
  } catch {
    // a folder that is not there yet gets an index of its own, by name
  }
  return join(cacheDir(env), 'index', `${createHash('sha256').update(real).digest('hex').slice(0, 16)}.json`);
}

/**
 * @param {string} root
 * @param {Record<string, string | undefined>} [env]
 * @returns {Index | null} null when there is none that this version can read
 */
export function loadIndex(root, env = process.env) {
  try {
    const index = JSON.parse(readFileSync(indexPath(root, env), 'utf8'));
    return index?.version === VERSION && index.files && typeof index.files === 'object' ? index : null;
  } catch {
    return null;
  }
}

/**
 * Written to a file of its own and then moved into place: two hooks finishing together
 * must not leave half an index behind.
 * @param {Index} index
 * @param {Record<string, string | undefined>} [env]
 */
export function saveIndex(index, env = process.env) {
  const file = indexPath(index.root, env);
  mkdirSync(dirname(file), { recursive: true });
  const draft = `${file}.${process.pid}.tmp`;
  writeFileSync(draft, JSON.stringify(index));
  renameSync(draft, file);
}

/**
 * The project file an import leads to, or null for a package or a file that is not indexed.
 * @param {string} from    the importing file, from the root
 * @param {string} spec    the import as written
 * @param {Set<string>} known
 */
function resolveImport(from, spec, known) {
  if (!spec.startsWith('.')) return null;
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  for (const ending of TRY) if (known.has(base + ending)) return base + ending;
  // "./x.js" written in a TypeScript file means x.ts
  const bare = base.replace(/\.[cm]?js$/, '');
  for (const ending of ['.ts', '.tsx', '.mts']) if (known.has(bare + ending)) return bare + ending;
  return null;
}

/**
 * The package an import names, or null for a file of the project: "lodash/debounce" is
 * lodash, "@scope/thing/part" is @scope/thing, "node:test" is itself.
 * @param {string} spec
 */
function packageOf(spec) {
  if (spec.startsWith('.') || spec.startsWith('/')) return null;
  if (spec.startsWith('node:')) return spec;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Bring the index of `root` up to date and save it if anything changed. A first build
 * of a large project stops at its time budget and goes on the next time it is asked.
 * @param {string} root
 * @param {{ env?: Record<string, string | undefined>, budgetMs?: number }} [options]
 * @returns {{ index: Index, changed: number }}
 */
export function refresh(root, { env = process.env, budgetMs = 400 } = {}) {
  const started = Date.now();
  /** @type {Index} */
  const index = loadIndex(root, env) ?? { version: VERSION, root, complete: false, files: {} };
  const { files } = sourceFiles(root);
  const known = new Set(files);
  let changed = 0;
  for (const rel of Object.keys(index.files)) {
    if (!known.has(rel)) {
      delete index.files[rel];
      changed++;
    }
  }
  let complete = true;
  /** @type {Record<string, string[]>} */
  const written = {};
  for (let at = 0; at < files.length; at++) {
    if (at % 20 === 0 && Date.now() - started > budgetMs) {
      complete = false;
      break;
    }
    const rel = files[at];
    let stat;
    try {
      stat = statSync(join(root, rel));
    } catch {
      continue;
    }
    const entry = index.files[rel];
    if (entry && entry.mtimeMs === stat.mtimeMs && entry.size === stat.size) continue;
    let found = { symbols: /** @type {import('./extract.mjs').Sym[]} */ ([]), imports: /** @type {string[]} */ ([]) };
    /** @type {string[]} */
    let names = [];
    if (stat.size <= MAX_BYTES) {
      try {
        const source = readFileSync(join(root, rel), 'utf8');
        found = extract(source);
        names = namesIn(source);
      } catch {
        // unreadable: it is listed with nothing in it, and read again when it changes
      }
    }
    const uses = /** @type {string[]} */ ([...new Set(found.imports.map(packageOf).filter((name) => name !== null))]);
    index.files[rel] = { mtimeMs: stat.mtimeMs, size: stat.size, test: isTest(rel), symbols: found.symbols, imports: [], uses, names };
    written[rel] = found.imports;
    changed++;
  }
  for (const [rel, specs] of Object.entries(written)) {
    index.files[rel].imports = [...new Set(specs.map((spec) => resolveImport(rel, spec, known)).filter((target) => target !== null))];
  }
  const wasComplete = index.complete;
  index.complete = complete;
  if (changed || wasComplete !== complete) saveIndex(index, env);
  return { index, changed };
}
