// Three questions put to the index:
//   what do the files of this project share?            (told when a session starts)
//   what does it already have for this request?         (told when the request arrives)
//   is what is being written already there?             (told when it is written)
import { extract } from './extract.mjs';
import { words } from './words.mjs';

const HELPER_DIRS = /(?:^|\/)(?:utils?|lib|libs|shared|common|helpers?|core|support)\//;
// What a field of a symbol is worth when a word of the request is found in it.
const WORTH = { name: 3, value: 2, doc: 1.5, more: 1, params: 1, path: 1 };
// Words in a name that say nothing about what it is about: isValidEmail is about "email".
const FILLER = new Set(['valid', 'check', 'run', 'from', 'as', 'all', 'my', 'our', 'the']);

/**
 * @typedef {import('./extract.mjs').Sym & { file: string }} Found
 * @typedef {import('./store.mjs').Index} Index
 */

/**
 * How many other files, tests apart, import each file.
 * @param {Index} index
 * @returns {Map<string, number>}
 */
function importedBy(index) {
  /** @type {Map<string, number>} */
  const count = new Map();
  for (const [file, entry] of Object.entries(index.files)) {
    if (entry.test) continue;
    for (const target of entry.imports) if (target !== file) count.set(target, (count.get(target) || 0) + 1);
  }
  return count;
}

/**
 * The exported functions and classes that the project's files share: those of the files
 * that others import, and of the folders where helpers are kept. Most shared first.
 * @param {Index} index
 * @param {{ limit?: number }} [options]
 * @returns {Found[]}
 */
export function digest(index, { limit = 24 } = {}) {
  const inbound = importedBy(index);
  /** @type {(Found & { rank: number })[]} */
  const shared = [];
  for (const [file, entry] of Object.entries(index.files)) {
    if (entry.test) continue;
    const rank = (inbound.get(file) || 0) * 2 + (HELPER_DIRS.test(file) ? 1.5 : 0);
    if (!rank) continue;
    for (const symbol of entry.symbols) {
      if (!symbol.exported || (symbol.kind === 'constant' && !symbol.doc)) continue;
      shared.push({ ...symbol, file, rank: rank + (symbol.doc ? 0.5 : 0) });
    }
  }
  shared.sort((a, b) => b.rank - a.rank || a.file.localeCompare(b.file) || a.line - b.line);
  return shared.slice(0, limit).map(({ rank, ...found }) => found);
}

// The packages tests are written with, and what each is called.
const RUNNERS = { 'node:test': 'node:test', vitest: 'Vitest', jest: 'Jest', '@jest/globals': 'Jest', mocha: 'Mocha', ava: 'AVA', tap: 'tap', uvu: 'uvu', '@playwright/test': 'Playwright' };

/**
 * Where the project keeps its tests and what they are written with, or null if it has none.
 * An agent that is not told this spends its first steps finding it out.
 * @param {Index} index
 * @returns {{ count: number, folder: string, beside: boolean, sample: string, runner: string | null } | null}
 */
export function testFacts(index) {
  const tests = Object.keys(index.files).filter((file) => index.files[file].test).sort();
  if (!tests.length) return null;
  /** @type {Map<string, string[]>} */
  const folders = new Map();
  for (const file of tests) {
    const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '.';
    folders.set(folder, [...(folders.get(folder) ?? []), file]);
  }
  const [folder, inFolder] = [...folders.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
  /** @type {Map<string, number>} */
  const runners = new Map();
  for (const file of tests) {
    for (const name of index.files[file].uses ?? []) {
      const runner = RUNNERS[/** @type {keyof typeof RUNNERS} */ (name)];
      if (runner) runners.set(runner, (runners.get(runner) || 0) + 1);
    }
  }
  const runner = [...runners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  // Tests spread over many folders, none with most of them, sit beside the code they test.
  const beside = folders.size >= 3 && inFolder.length * 2 < tests.length;
  return { count: tests.length, folder, beside, sample: inFolder[0], runner };
}

/**
 * The names and the files a request spells out. Whoever wrote "parsePage in src/api/page.js"
 * does not need to be told that they exist.
 * @param {string} text
 */
function spelledOut(text) {
  const names = new Set();
  for (const [name] of text.matchAll(/[A-Za-z_$][\w$]*/g)) {
    if (/[a-z0-9][A-Z]|_/.test(name)) names.add(name);
  }
  for (const [, name] of text.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) names.add(name);
  const files = [...text.matchAll(/[\w./\\-]+\.(?:m?js|cjs|jsx|ts|mts|cts|tsx)\b/g)].map(([file]) => file.replace(/\\/g, '/').replace(/^\.\//, ''));
  return { names, files };
}

/**
 * What the project already has that a request may need: the symbols that share its
 * rarest words, best first. Nothing is returned for a request with nothing to go by.
 * @param {Index} index
 * @param {string} text
 * A symbol is brought up when the request uses a word of its name and at least one
 * more of its words, or a word of its name that hardly anything else in the project
 * has. One common word in common, "list" or "page", is how most false hints are made.
 * @param {{ limit?: number, floor?: number, share?: number, perFile?: number, loose?: boolean }} [options]
 *   floor: the least a match must score; share: the least it must score next to the best one;
 *   loose: a word of its comment is enough, which suits a person searching and not a hint
 * @returns {(Found & { score: number, matched: string[] })[]}
 */
export function hintsFor(index, text, { limit = 4, floor = 6, share = 0.3, perFile = 2, loose = false } = {}) {
  const asked = new Set(words(text));
  if (!asked.size) return [];
  const spelled = spelledOut(String(text));

  /** @type {{ found: Found, weights: Map<string, number>, real: Set<string>, named: Set<string> }[]} */
  const candidates = [];
  /** @type {Map<string, number>} */
  const spread = new Map();                                   // in how many symbols each word appears
  for (const [file, entry] of Object.entries(index.files)) {
    if (entry.test) continue;
    const pathWords = words(file.replace(/\.[^./]+$/, ''));
    for (const symbol of entry.symbols) {
      /** @type {Map<string, number>} */
      const weights = new Map();
      /** @type {Set<string>} */
      const real = new Set();
      /** @type {[keyof typeof WORTH, string | undefined][]} */
      const fields = [['name', symbol.name], ['value', symbol.value], ['doc', symbol.doc], ['more', symbol.more], ['params', symbol.params]];
      for (const [field, value] of fields) {
        for (const word of words(value ?? '')) {
          weights.set(word, Math.max(weights.get(word) || 0, WORTH[field]));
          real.add(word);
        }
      }
      for (const word of pathWords) weights.set(word, Math.max(weights.get(word) || 0, WORTH.path));
      for (const word of weights.keys()) spread.set(word, (spread.get(word) || 0) + 1);
      candidates.push({ found: { ...symbol, file }, weights, real, named: new Set([...words(symbol.name), ...words(symbol.value ?? '')]) });
    }
  }

  const total = candidates.length;
  /** @type {(Found & { score: number, matched: string[] })[]} */
  const scored = [];
  for (const { found, weights, real, named } of candidates) {
    if (spelled.names.has(found.name) || spelled.files.some((file) => found.file.endsWith(file))) continue;
    let score = 0;
    const matched = [];
    let inName = 0;
    let rare = false;
    for (const word of asked) {
      const weight = weights.get(word);
      if (!weight) continue;
      score += weight * Math.log(1 + total / /** @type {number} */ (spread.get(word)));
      if (!real.has(word)) continue;                          // a folder's name alone is not the symbol
      matched.push(word);
      if (named.has(word)) {
        inName++;
        if (/** @type {number} */ (spread.get(word)) <= 2) rare = true;
      }
    }
    if (loose ? matched.length : inName && (matched.length >= 2 || rare)) scored.push({ ...found, score, matched });
  }
  scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);
  const best = scored[0]?.score ?? 0;
  /** @type {Map<string, number>} */
  const taken = new Map();
  const out = [];
  for (const hit of scored) {
    if (hit.score < floor || hit.score < best * share || out.length >= limit) break;
    const count = taken.get(hit.file) || 0;
    if (count >= perFile) continue;
    taken.set(hit.file, count + 1);
    out.push(hit);
  }
  return out;
}

/**
 * What a name is about, with the order and the filler taken out: isValidEmail -> "email".
 * @param {string} name
 */
function about(name) {
  return [...new Set(words(name))].filter((word) => !FILLER.has(word)).sort().join(' ');
}

/**
 * The names that a piece of source text defines at the start of a line.
 * @param {string} text
 * @returns {{ name: string, kind: string }[]}
 */
export function definitionsIn(text) {
  return extract(String(text ?? '')).symbols.map(({ name, kind }) => ({ name, kind }));
}

/**
 * For definitions that are new in `file`: the exported symbol of another file that is
 * called the same, or that is about the same and is the same kind of thing.
 * @param {Index} index
 * @param {string} file  from the root, with forward slashes
 * @param {{ name: string, kind: string }[]} definitions
 * @returns {{ name: string, twin: Found }[]} one twin at most for each definition
 */
export function twinsOf(index, file, definitions) {
  const out = [];
  for (const { name, kind } of definitions) {
    const subject = about(name);
    /** @type {Found | null} */
    let same = null;
    /** @type {Found | null} */
    let alike = null;
    for (const [other, entry] of Object.entries(index.files)) {
      if (other === file || entry.test) continue;
      for (const symbol of entry.symbols) {
        if (!symbol.exported) continue;
        // Constants must be called exactly the same: DEFAULTS in one module and defaults in another are two things.
        if (symbol.name === name) same ??= { ...symbol, file: other };
        else if (subject && kind !== 'constant' && symbol.kind !== 'constant' && about(symbol.name) === subject) alike ??= { ...symbol, file: other };
      }
    }
    const twin = same ?? alike;
    if (twin) out.push({ name, twin });
  }
  return out;
}
