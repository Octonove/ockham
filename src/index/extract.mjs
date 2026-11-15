// What a source file defines, read with regular expressions (decision D6: no parser).
// Only declarations that start a line count: that is where a file's own functions,
// constants and classes are, and it keeps what is nested inside them out.
// JavaScript and TypeScript for now.

/**
 * @typedef {object} Sym
 * @property {string} name
 * @property {'function' | 'constant' | 'class'} kind
 * @property {number} line        counted from 1
 * @property {boolean} exported
 * @property {string} [params]    a function's parameters, as written
 * @property {string} [value]     a constant's value, when it is plain arithmetic
 * @property {string} [doc]       the first sentence of the comment above it
 * @property {string} [more]      the rest of that comment, cut short: more words to be found by
 */

const NAME = '[A-Za-z_$][\\w$]*';
const FUNCTION = new RegExp(`^(export\\s+)?(default\\s+)?(?:async\\s+)?function\\s*\\*?\\s*(${NAME})\\s*\\(`);
const VARIABLE = new RegExp(`^(export\\s+)?(?:const|let|var)\\s+(${NAME})\\s*(?::[^=]+?)?=(?!=)\\s*(.*)$`);
const CLASS = new RegExp(`^(export\\s+)?(default\\s+)?(?:abstract\\s+)?class\\s+(${NAME})`);
const ONE_PARAMETER = new RegExp(`^(?:async\\s+)?(${NAME})\\s*=>`);
const EXPORT_LIST = /^export\s*\{([^}]*)\}/;
const EXPORT_DEFAULT = new RegExp(`^export\\s+default\\s+(${NAME})\\s*;?\\s*$`);
const CJS_LIST = /^module\.exports\s*=\s*\{([^}]*)\}/;
const CJS_ONE = new RegExp(`^(?:module\\.)?exports\\.(${NAME})\\s*=`);
const IMPORT = /^(?:(?:import|export)\s+(?:[^'"]*?\s+from\s+)?|\}\s*from\s+)['"]([^'"]+)['"]/;
const LOADED = /\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;
const ARITHMETIC = /^(?=.*\d)[-\d_.\s*+/()]+$/;
// A constant with one of these in its name may hold something private: its value is never kept.
const PRIVATE = /key|token|secret|passw|auth|credential|private|salt/i;

/**
 * What is inside the parentheses that open at `from` on line `at`, and what follows them.
 * @param {string[]} lines
 * @param {number} at
 * @param {number} from
 * @returns {{ inside: string, after: string } | null} null when they do not close within a few lines
 */
function parenthesised(lines, at, from) {
  let depth = 0;
  let inside = '';
  for (let row = at; row < lines.length && row < at + 12; row++) {
    const line = row === at ? lines[row].slice(from) : lines[row];
    for (let column = 0; column < line.length; column++) {
      const char = line[column];
      if (char === '(') depth++;
      else if (char === ')' && --depth === 0) return { inside: inside.slice(1).replace(/\s+/g, ' ').trim().slice(0, 160), after: line.slice(column + 1) };
      if (depth > 0) inside += char;
    }
    inside += ' ';
  }
  return null;
}

/**
 * The comment that ends on the line above `at`: its first sentence, and the rest.
 * @param {string[]} lines
 * @param {number} at
 * @returns {{ doc?: string, more?: string }}
 */
function commentAbove(lines, at) {
  let end = at - 1;
  while (end >= 0 && /^\s*@\w/.test(lines[end])) end--;      // decorators sit between a comment and its class
  if (end < 0) return {};
  /** @type {string[]} */
  let body = [];
  if (/\*\/\s*$/.test(lines[end])) {
    let start = end;
    while (start > 0 && !/\/\*/.test(lines[start])) start--;
    body = lines.slice(start, end + 1);
  } else if (/^\s*\/\//.test(lines[end])) {
    let start = end;
    while (start > 0 && /^\s*\/\//.test(lines[start - 1])) start--;
    body = lines.slice(start, end + 1);
  } else {
    return {};
  }
  const kept = body
    .map((line) => line.replace(/^\s*(?:\/\*\*?|\*\/|\*|\/\/+)\s?/, '').replace(/\*\/\s*$/, '').trim())
    .filter((line) => line && !line.startsWith('@') && !/^(eslint|ts-|prettier|istanbul|c8)\b/.test(line));
  const text = kept.join(' ');
  if (!text) return {};
  // The first sentence, or the first line of a comment that is a list and has no sentences.
  const sentence = text.match(/^(.{1,160}?[.!?])(?:\s|$)/);
  const doc = (sentence ? sentence[1] : kept[0]).slice(0, 160).trim();
  const more = text.slice(doc.length).trim().slice(0, 240);
  return more ? { doc, more } : { doc };
}

/**
 * @param {string} source
 * @returns {{ symbols: Sym[], imports: string[] }} imports as written, each once
 */
export function extract(source) {
  const lines = String(source).split(/\r?\n/);
  /** @type {Sym[]} */
  const symbols = [];
  /** @type {Set<string>} */
  const imports = new Set();
  /** @type {Set<string>} */
  const exportedLater = new Set();

  for (let at = 0; at < lines.length; at++) {
    const line = lines[at];
    for (const found of line.matchAll(LOADED)) imports.add(found[1]);
    if (!line || /^\s/.test(line)) continue;                  // only what starts a line

    const brought = line.match(IMPORT);
    if (brought) {
      imports.add(brought[1]);
      continue;                                               // "export { a } from './b.js'" defines nothing here
    }
    const listed = line.match(EXPORT_LIST) || line.match(CJS_LIST);
    if (listed) {
      for (const item of listed[1].split(',')) {
        const name = item.trim().split(/\s+as\s+|\s*:\s*/)[0].trim();
        if (name) exportedLater.add(name);
      }
      continue;
    }
    const one = line.match(CJS_ONE) || line.match(EXPORT_DEFAULT);
    if (one) {
      exportedLater.add(one[1]);
      continue;
    }

    const fn = line.match(FUNCTION);
    if (fn) {
      symbols.push({ name: fn[3], kind: 'function', line: at + 1, exported: Boolean(fn[1]), params: parenthesised(lines, at, line.indexOf('('))?.inside ?? '', ...commentAbove(lines, at) });
      continue;
    }
    const cls = line.match(CLASS);
    if (cls) {
      symbols.push({ name: cls[3], kind: 'class', line: at + 1, exported: Boolean(cls[1]), ...commentAbove(lines, at) });
      continue;
    }
    const variable = line.match(VARIABLE);
    if (!variable) continue;
    const [, exported, name, rest] = variable;
    /** @type {Sym} */
    const symbol = { name, kind: 'constant', line: at + 1, exported: Boolean(exported), ...commentAbove(lines, at) };
    const single = rest.match(ONE_PARAMETER);
    if (single) {
      symbol.kind = 'function';
      symbol.params = single[1];
    } else if (/^(?:async\s+)?(?:function\b|\()/.test(rest)) {
      // "function (a) {", or "(a, b) =>" with its arrow perhaps some lines down; "(a + b) * 2" is neither
      const group = parenthesised(lines, at, line.indexOf('(', line.indexOf('=')));
      if (group && (/^(?:async\s+)?function\b/.test(rest) || /^\s*(?::[^=]{1,80})?=>/.test(group.after))) {
        symbol.kind = 'function';
        symbol.params = group.inside;
      }
    } else {
      const value = rest.replace(/\s*;?\s*(?:\/\/.*)?$/, '');
      if (ARITHMETIC.test(value) && !PRIVATE.test(name)) symbol.value = value.trim();
    }
    symbols.push(symbol);
  }
  for (const symbol of symbols) if (exportedLater.has(symbol.name)) symbol.exported = true;
  return { symbols, imports: [...imports] };
}
