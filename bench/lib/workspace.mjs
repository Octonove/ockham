// A benchmark cell works on a copy of a task's seed project. These helpers copy
// the seed and say what a run changed in it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git']);
const SOURCE = /\.(js|mjs|cjs|jsx|ts|tsx|py)$/;
const TEST = /(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$/;

/** @param {string} rel a path with forward slashes */
export const isTestFile = (rel) => TEST.test(rel);
/** @param {string} rel */
export const isSourceFile = (rel) => SOURCE.test(rel) && !isTestFile(rel);

/**
 * @param {string} from
 * @param {string} to
 */
export function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

/**
 * Every file under root, as paths with forward slashes.
 * @param {string} root
 * @returns {string[]}
 */
export function listFiles(root) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} rel */
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(child);
      } else if (entry.isFile()) {
        out.push(child);
      }
    }
  };
  if (existsSync(root)) walk('');
  return out.sort();
}

/** @param {string} text */
const meaningfulLines = (text) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

/**
 * How many lines of `after` were not in `before`.
 * shortcut: a multiset difference, not a real diff, so a moved line counts as nothing added; use a diff algorithm if moves start to matter.
 * @param {string} before
 * @param {string} after
 */
export function addedLines(before, after) {
  /** @type {Map<string, number>} */
  const have = new Map();
  for (const line of meaningfulLines(before)) have.set(line, (have.get(line) || 0) + 1);
  let added = 0;
  for (const line of meaningfulLines(after)) {
    const left = have.get(line) || 0;
    if (left > 0) have.set(line, left - 1);
    else added++;
  }
  return added;
}

/**
 * What a run changed compared with the seed it started from.
 * @param {string} seedDir
 * @param {string} workDir
 */
export function diffTrees(seedDir, workDir) {
  /** @param {string} dir */
  const read = (dir) => new Map(listFiles(dir).map((file) => [file, readFileSync(join(dir, file), 'utf8')]));
  const before = read(seedDir);
  const after = read(workDir);
  /** @type {string[]} */
  const changed = [];
  /** @type {string[]} */
  const added = [];
  let sourceLinesAdded = 0;
  let testLinesAdded = 0;
  for (const [file, text] of after) {
    const old = before.get(file);
    if (old === text) continue;
    (old === undefined ? added : changed).push(file);
    const count = addedLines(old ?? '', text);
    if (isTestFile(file)) testLinesAdded += count;
    else if (isSourceFile(file)) sourceLinesAdded += count;
  }
  const removed = [...before.keys()].filter((file) => !after.has(file));
  const touched = [...changed, ...added];
  return {
    changed,
    added,
    removed,
    sourceLinesAdded,
    testLinesAdded,
    sourceFilesTouched: touched.filter(isSourceFile).length,
    wroteTests: touched.some(isTestFile),
  };
}

/**
 * Dependencies in the run's package.json that the seed did not have.
 * @param {string} seedDir
 * @param {string} workDir
 * @returns {string[]}
 */
export function depsAdded(seedDir, workDir) {
  /** @param {string} dir */
  const deps = (dir) => {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      return { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies };
    } catch {
      return {};
    }
  };
  const before = deps(seedDir);
  return Object.keys(deps(workDir)).filter((name) => !(name in before)).sort();
}

/**
 * Did the run use the helper the seed already had? Both patterns must match the file.
 * @param {{ file: string, patterns: string[] }} rule
 * @param {string} workDir
 */
export function reused(rule, workDir) {
  try {
    const text = readFileSync(join(workDir, rule.file), 'utf8');
    return rule.patterns.every((pattern) => new RegExp(pattern).test(text));
  } catch {
    return false;
  }
}
