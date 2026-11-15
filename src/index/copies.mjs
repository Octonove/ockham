// Where else the project has the line that a change replaces.
//
// A bug that was copied has to be fixed in every copy, and an agent finds the other one
// only if its first search happens to show it. Told what the project already has, it
// searches less, and then it finds it less. So the looking is done here, when the edit
// is made: the lines the edit takes away are compared, token by token, with the lines
// of the files that use the same names.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Words of the language and of its standard library: they say nothing about what a line is about.
const PLAIN = new Set(`
return const let var function async await if else for while do of in new this true false null undefined typeof instanceof
import export from default class extends super throw try catch finally switch case break continue void delete yield static
Math JSON Object Array String Number Boolean Date Promise Error Map Set RegExp console process require module exports
length map filter reduce forEach find some every includes push pop slice splice join split concat keys values entries
test replace trim toString parseInt parseFloat isNaN
`.trim().split(/\s+/));

const TOKEN = /[A-Za-z_$][\w$]*|\d[\d_.]*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|[-+*/%]=|\.\.\.|[^\s\w]/g;

/**
 * A line as its tokens: names, numbers, texts, operators, punctuation. Spaces do not count.
 * @param {string} line
 * @returns {string[]}
 */
export function tokens(line) {
  return String(line).match(TOKEN) ?? [];
}

/** Whether a token says what its line is about: a name of the project's own, or a number. @param {string} token */
const tells = (token) => (/^[A-Za-z_$]/.test(token) && token.length >= 3 && !PLAIN.has(token)) || /^\d[\d_.]+$/.test(token);

/**
 * The names a source text uses that say what it is about. Kept in the index for every
 * file, so that only the files that share names with a changed line have to be read.
 * @param {string} source
 * @returns {string[]}
 */
export function namesIn(source) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const [name] of String(source).matchAll(/[A-Za-z_$][\w$]{2,}/g)) if (!PLAIN.has(name)) names.add(name);
  return [...names];
}

// The line that opens a function or a class says how it is called, not what it does.
const HEADER = /^(?:export\s+)?(?:default\s+)?(?:(?:async\s+)?function\b|(?:abstract\s+)?class\b|(?:const|let|var)\s+[\w$]+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>\s*\{?\s*$)/;

/** @param {string} line */
const isCode = (line) => {
  const text = line.trim();
  return text !== '' && !/^(?:\/\/|\/\*|\*|import\b|export\s*\{|export\s+\*|\}\s*from\b)/.test(text) && !HEADER.test(text);
};

/**
 * The lines of `before` that `after` no longer has: what a change takes away or rewrites.
 * @param {string} before
 * @param {string} after
 * @returns {string[]}
 */
export function linesTakenAway(before, after) {
  const kept = new Set(String(after).split(/\r?\n/).map((line) => tokens(line).join(' ')));
  return String(before).split(/\r?\n/).filter((line) => isCode(line) && !kept.has(tokens(line).join(' ')));
}

/**
 * The longest list of tokens that two lines have in the same order, with anything in
 * between: "points > reward.cost" is in "customer.points > reward.cost" whole.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
export function inCommon(a, b) {
  const rows = a.length + 1;
  const columns = b.length + 1;
  const table = new Uint16Array(rows * columns);
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < columns; j++) {
      table[i * columns + j] = a[i - 1] === b[j - 1]
        ? table[(i - 1) * columns + j - 1] + 1
        : Math.max(table[(i - 1) * columns + j], table[i * columns + j - 1]);
    }
  }
  const out = [];
  for (let i = a.length, j = b.length; i > 0 && j > 0;) {
    if (a[i - 1] === b[j - 1]) {
      out.push(a[i - 1]);
      i--;
      j--;
    } else if (table[(i - 1) * columns + j] >= table[i * columns + j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return out.reverse();
}

/**
 * What a line lost when it was replaced: its tokens that none of the lines the change
 * brings in gives back, counted, so that one `>` of two going away is seen. A line that
 * is only split over several loses nothing, and neither does one that is only added to.
 * A change that brings no line in at all is a deletion, and is left alone.
 * @param {string[]} mine       the tokens of the line taken away
 * @param {string[][]} arriving the tokens of each line the change brings in
 * @returns {Set<string>}
 */
function lostBy(mine, arriving) {
  /** @type {Set<string>} */
  const lost = new Set();
  if (!arriving.length) return lost;
  /** @type {Map<string, number>} */
  const left = new Map();
  for (const line of arriving) for (const token of line) left.set(token, (left.get(token) || 0) + 1);
  for (const token of mine) {
    const count = left.get(token) || 0;
    if (count) left.set(token, count - 1);
    else lost.add(token);
  }
  return lost;
}

/**
 * The other places of the project that have what a change replaces.
 *
 * A line is such a place when it has, in the same order, most of the tokens of a line
 * the change takes away (six at least, and three in five of them), all of its names
 * but one at the most, and something the change removes: the part that was wrong.
 * A change that only adds to a line, a new argument or a call wrapped round it, takes
 * nothing out, and is not a fix that other lines are waiting for.
 * @param {import('./store.mjs').Index} index
 * @param {string} root
 * @param {string} file     the file being changed, from the root
 * @param {string} before   the text the change replaces
 * @param {string} after    the text it puts there
 * @param {{ limit?: number, read?: (path: string) => string }} [options]
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function copiesOf(index, root, file, before, after, { limit = 2, read = (path) => readFileSync(path, 'utf8') } = {}) {
  const was = new Set(String(before).split(/\r?\n/).map((line) => tokens(line).join(' ')));
  const fixed = new Set(String(after).split(/\r?\n/).map((line) => tokens(line).join(' ')));
  // The lines the change brings in: those of its new text that the old one did not have.
  const arriving = String(after).split(/\r?\n/).map(tokens).filter((line) => line.length && !was.has(line.join(' ')));
  /** @type {{ file: string, line: number, text: string, shared: number }[]} */
  const found = [];
  /** @type {Map<string, string[]>} */
  const sources = new Map();
  for (const taken of linesTakenAway(before, after).slice(0, 6)) {
    const mine = tokens(taken);
    const names = [...new Set(mine.filter(tells))];
    if (mine.length < 6 || names.length < 2) continue;
    const gone = lostBy(mine, arriving);
    if (!gone.size) continue;
    const enoughTokens = Math.max(6, Math.ceil(mine.length * 0.6));
    const enoughNames = Math.max(2, names.length - 1);

    // Only the files that use enough of the line's names can hold a copy of it.
    const candidates = Object.entries(index.files)
      .filter(([other, entry]) => other !== file && !entry.test)
      .map(([other, entry]) => ({ other, shared: names.filter((name) => /^\d/.test(name) || (entry.names ?? []).includes(name)).length }))
      .filter((candidate) => candidate.shared >= enoughNames)
      .sort((a, b) => b.shared - a.shared || a.other.localeCompare(b.other))
      .slice(0, 25);
    for (const { other } of candidates) {
      if (!sources.has(other)) {
        try {
          sources.set(other, read(join(root, other)).split(/\r?\n/));
        } catch {
          sources.set(other, []);
        }
      }
      /** @type {string[]} */ (sources.get(other)).forEach((text, at) => {
        if (!isCode(text)) return;
        const theirs = tokens(text);
        if (theirs.length < 6 || fixed.has(theirs.join(' '))) return;
        // The cheap test first: a line without the names cannot be a copy.
        const has = new Set(theirs);
        if (names.filter((name) => has.has(name)).length < enoughNames) return;
        const shared = inCommon(mine, theirs);
        if (shared.length < enoughTokens || new Set(shared.filter(tells)).size < enoughNames) return;
        if (!shared.some((token) => gone.has(token))) return;
        found.push({ file: other, line: at + 1, text: text.trim().slice(0, 160), shared: shared.length });
      });
    }
  }
  found.sort((a, b) => b.shared - a.shared || a.file.localeCompare(b.file) || a.line - b.line);
  /** @type {Set<string>} */
  const seen = new Set();
  const out = [];
  for (const { shared, ...place } of found) {
    const key = `${place.file}:${place.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
    if (out.length >= limit) break;
  }
  return out;
}
