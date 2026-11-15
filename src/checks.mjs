// What a task leaves behind, looked at once when it ends.
//
// The rules speak before the agent writes, and the index while it writes. This is the look
// afterwards, at the files the task changed, as they were and as they are:
//   deps    package.json names a dependency that it did not, and the request did not ask for it
//   twin    something is defined that another file already exports
//   copy    what the task replaced in one file is still in another
//   guard   a file whose functions are all still there makes fewer checks than it made
//   test    risky logic was changed and no test was touched
//   run     source was written after the last time the tests ran, in a session that has a shell
//   claim   the agent's summary says the tests pass, and they were not run
// All but the last are worked out from the files, never from what the agent says it did.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { copiesOf, linesTakenAway, tokens } from './index/copies.mjs';
import { extract } from './index/extract.mjs';
import { definitionsIn, testFacts, twinsOf } from './index/lookup.mjs';
import { isTest, SOURCE } from './index/scan.mjs';

export const CHECKS = ['deps', 'twin', 'copy', 'guard', 'test', 'run', 'claim'];
// The checks that are made when nobody says. One is here only when a measurement said that it
// finds what it looks for and leaves a clean task alone (docs/checks.md).
const BY_DEFAULT = CHECKS;

/**
 * @typedef {object} Left  what a task did, as far as its files and its commands show
 * @property {string} root
 * @property {Map<string, string | null>} before  every file the task wrote, as it was; null where there was none
 * @property {string[] | null} deps     the dependencies package.json named when the task began; null if it could not be read
 * @property {string} [prompt]          what was asked
 * @property {Set<string>} [told]       what the session was told while it wrote: a twin it was shown is not brought up again
 * @property {boolean} [shell]          whether the session has run a command, which is how it shows that it can
 * @property {boolean} [tested]         whether the tests ran after the last time source was written
 * @property {string} [reply]           what the agent says as it finishes
 *
 * @typedef {object} Finding
 * @property {string} check             one of CHECKS
 * @property {string} [file]
 * @property {string[]} [names]         the dependencies, or what was defined twice
 * @property {string} [twin]            where the project already has it
 * @property {{ file: string, line: number, text: string }[]} [places]  where the copies are
 * @property {string[]} [lines]         the lines that made the checks that are gone
 * @property {string} [why]             what makes the logic risky: fix, money, parsing, validation or security
 */

/**
 * The checks an environment asks for. OCKHAM_CHECKS=off gives none, a list of names gives
 * those, anything else gives the ones that ship on. OCKHAM_TESTS=off takes the one about a
 * missing test out: nobody who asked for no tests wants to be asked for one at the end.
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function checksOn(env) {
  const asked = String(env.OCKHAM_CHECKS || '').trim().toLowerCase();
  if (asked === 'off') return [];
  const named = asked.split(',').map((name) => name.trim()).filter((name) => CHECKS.includes(name));
  const on = named.length ? named : BY_DEFAULT;
  return String(env.OCKHAM_TESTS || '').trim().toLowerCase() === 'off' ? on.filter((name) => name !== 'test') : on;
}

/**
 * @param {string} root
 * @param {string} file
 * @returns {string | null} null for a file that is not there
 */
function current(root, file) {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return null;
  }
}

/**
 * The packages a package.json depends on, of every kind.
 * @param {string | null} text
 * @returns {string[] | null} null for text that is not a package.json
 */
export function dependencies(text) {
  try {
    const pkg = JSON.parse(String(text));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies });
  } catch {
    return null;
  }
}

/**
 * The source files a task changed and left in place.
 * @param {Left} left
 * @returns {{ file: string, before: string | null, after: string }[]}
 */
function changedSource(left) {
  const out = [];
  for (const [file, before] of left.before) {
    if (!SOURCE.test(file) || isTest(file)) continue;
    const after = current(left.root, file);
    if (after !== null && after !== before) out.push({ file, before, after });
  }
  return out;
}

/** @param {Left} left @returns {Finding[]} */
function newDependencies(left) {
  const have = left.deps && dependencies(current(left.root, 'package.json'));
  if (!left.deps || !have) return [];
  const asked = String(left.prompt ?? '').toLowerCase();
  // A dependency the request names was asked for.
  const names = have.filter((name) => !left.deps?.includes(name) && !asked.includes(name.toLowerCase()));
  return names.length ? [{ check: 'deps', names: names.slice(0, 4) }] : [];
}

/**
 * @param {import('./index/store.mjs').Index} index
 * @param {Left} left
 * @param {ReturnType<typeof changedSource>} changed
 * @returns {Finding[]}
 */
function secondVersions(index, left, changed) {
  /** @type {Finding[]} */
  const out = [];
  for (const { file, before, after } of changed) {
    const had = new Set(definitionsIn(before ?? '').map((definition) => definition.name));
    const fresh = definitionsIn(after).filter((definition) => !had.has(definition.name));
    for (const { name, twin } of twinsOf(index, file, fresh)) {
      // What the session was shown when it wrote it, it has decided about.
      if (!left.told?.has(`twin:${file}#${name}`)) out.push({ check: 'twin', file, names: [name], twin: `\`${twin.name}\` in ${twin.file}:${twin.line}` });
    }
    // A value worked out in place and given the very name of a function another file exports:
    // `const initials = ...` where the project has initials(name). A file that calls that
    // function cannot also have a value of its name beside the call.
    for (const [, name] of linesTakenAway(after, before ?? '').join('\n').matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=(?!=)/g)) {
      for (const [other, entry] of Object.entries(index.files)) {
        const twin = other !== file && !entry.test && entry.symbols.find((symbol) => symbol.exported && symbol.kind === 'function' && symbol.name === name);
        if (twin && !out.some((finding) => finding.names?.[0] === name)) out.push({ check: 'twin', file, names: [name], twin: `\`${twin.name}(${twin.params ?? ''})\` in ${other}:${twin.line}` });
      }
    }
  }
  return out.slice(0, 2);
}

/**
 * @param {import('./index/store.mjs').Index} index
 * @param {Left} left
 * @param {ReturnType<typeof changedSource>} changed
 * @returns {Finding[]}
 */
function copiesLeft(index, left, changed) {
  const mine = new Set(changed.map((one) => one.file));
  /** @type {Map<string, { file: string, line: number, text: string }>} */
  const places = new Map();
  for (const { file, before, after } of changed) {
    if (before === null) continue;
    // A place in a file the task also changed, it found without help.
    for (const place of copiesOf(index, left.root, file, before, after)) if (!mine.has(place.file)) places.set(`${place.file}:${place.line}`, place);
  }
  return places.size ? [{ check: 'copy', places: [...places.values()].slice(0, 2) }] : [];
}

const VALIDATOR = /^(?:is[A-Z]\w*|validate\w*|sanitiz\w*|escape\w*|encodeURI(?:Component)?|assert\w*|verify\w*)$/;
const STUB = /not implemented|unimplemented|\btodo\b/i;

/**
 * Source with the words of its template strings taken out and what they work out left in:
 * `<p>${escapeNote(text)}</p>` makes a call, and the signs round its tags compare nothing.
 * shortcut: a backtick inside a regular expression or a comment is taken for the start of a
 * template; a real tokenizer would not be fooled, and is the upgrade if this ever matters.
 * @param {string} text
 */
function withoutTemplateWords(text) {
  let out = '';
  /** @type {('words' | number)[]} */
  const inside = [];                                          // 'words' in a template's text; a number in one of its ${ }: the braces open there
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const top = inside[inside.length - 1];
    if (top === 'words') {
      if (char === '\\') i++;
      else if (char === '`') inside.pop();
      else if (char === '$' && text[i + 1] === '{') inside.push(0), i++;
      out += char === '\n' ? '\n' : ' ';
    } else if (char === '`') {
      inside.push('words');
      out += ' ';
    } else if (typeof top === 'number' && char === '}' && top === 0) {
      inside.pop();
      out += ' ';
    } else if (char === "'" || char === '"') {
      // A plain text, whole: to its end, or to the end of its line if it is not one after all.
      let end = i + 1;
      while (end < text.length && text[end] !== char && text[end] !== '\n') end += text[end] === '\\' ? 2 : 1;
      out += text.slice(i, end + 1);
      i = end;
    } else {
      if (typeof top === 'number' && (char === '{' || char === '}')) inside[inside.length - 1] = top + (char === '{' ? 1 : -1);
      out += char;
    }
  }
  return out;
}

/**
 * The checks a piece of source makes, counted by kind:
 *   limit:<n>  a comparison of sizes, with the number in it if it has one, or a number that
 *              something is held to with min, max or clamp
 *   throw      a throw; the one of a stub that says "not implemented" is not a check
 *   typeof     a look at what kind of thing a value is
 *   call:<f>   a call of something whose name says that it checks or cleans
 * @param {string} text
 * @returns {Map<string, number>}
 */
export function checksMade(text) {
  /** @type {Map<string, number>} */
  const made = new Map();
  const add = (/** @type {string} */ kind) => made.set(kind, (made.get(kind) || 0) + 1);
  const number = (/** @type {string | undefined} */ token) => /^\d/.test(token ?? '');
  for (const line of withoutTemplateWords(String(text)).split(/\r?\n/)) {
    const code = line.trim();
    if (!code || /^(?:\/\/|\/\*|\*)/.test(code)) continue;
    const all = tokens(code);
    all.forEach((token, at) => {
      if (/^(?:<|>|<=|>=)$/.test(token)) {
        add(`limit:${[all[at - 1], all[at + 1]].find(number) ?? ''}`);
      } else if (/^(?:min|max|clamp)$/.test(token) && all[at + 1] === '(') {
        // The numbers among what it is given: Math.min(100, x) holds x to 100, clamp(x, 0, 100) to both.
        for (let i = at + 1, depth = 0; i < all.length; i++) {
          if (all[i] === '(') depth++;
          else if (all[i] === ')' && --depth === 0) break;
          else if (depth === 1 && number(all[i]) && /^[(,]$/.test(all[i - 1]) && /^[),]$/.test(all[i + 1] ?? '')) add(`limit:${all[i]}`);
        }
      } else if (token === 'throw' && !STUB.test(code)) add('throw');
      else if (token === 'typeof') add('typeof');
      else if (VALIDATOR.test(token) && all[at + 1] === '(' && all[at - 1] !== 'function') add(`call:${token}`);
    });
  }
  return made;
}

/**
 * The checks that the files of a task made and no longer make, with the lines that made them.
 *
 * A check of a kind is lost when none like it is left and the task's files make fewer of
 * that kind than they did: a limit with another number, or with a name where the number
 * was, is the same check, and one way of cleaning input put in the place of another is still
 * cleaning. Only a limit with a number in it can be lost. A throw is lost when there are fewer of them. Everything the task wrote is
 * counted together, new files too: a check moved into a helper that two files now share is
 * still made. A file that lost a function is left out of what was there: the function took
 * its checks with it, and taking it out was the change.
 * @param {{ file: string, before: string | null, after: string }[]} changed
 * @returns {{ file: string, lines: string[] }[]} for each file, the lines that made what is gone, three at the most
 */
export function checksLost(changed) {
  const defined = (/** @type {string} */ text) => new Set(definitionsIn(text).map((definition) => definition.name));
  const kept = changed.filter(({ before, after }) => {
    const still = defined(after);
    return before !== null && [...defined(before)].every((name) => still.has(name));
  });
  /** @param {string[]} texts */
  const made = (texts) => {
    /** @type {Map<string, number>} */
    const all = new Map();
    for (const text of texts) for (const [key, n] of checksMade(text)) all.set(key, (all.get(key) || 0) + n);
    return all;
  };
  const had = made(kept.map(({ before }) => String(before)));
  const has = made(changed.map(({ after }) => after));
  const count = (/** @type {Map<string, number>} */ all, /** @type {string} */ kind) => [...all].reduce((sum, [key, n]) => (key.split(':')[0] === kind ? sum + n : sum), 0);
  const lost = new Set([...had.keys()].filter((key) => {
    const kind = key.split(':')[0];
    // A comparison of two names counts among the limits that are left, and is not one that can
    // be lost: the order of a sort is not a check.
    return key !== 'limit:' && count(has, kind) < count(had, kind) && (kind === 'throw' || !has.get(key));
  }));
  if (!lost.size) return [];
  return kept.map(({ file, before, after }) => {
    const gone = linesTakenAway(String(before), after).filter((line) => [...checksMade(line).keys()].some((key) => lost.has(key)));
    return { file, lines: [...new Set(gone.map((line) => line.trim().slice(0, 120)))].slice(0, 3) };
  }).filter(({ lines }) => lines.length);
}

// What rule 7 calls risky, as a program can tell it: the request is a fix, or what the change
// touches speaks of money, of taking text apart, of what input is accepted, or of what an
// attacker can reach.
const FIX = /\b(?:bug|fix(?:es|ed)?|broken|wrong(?:ly)?|incorrect(?:ly)?|crash(?:es|ed)?|regression)\b/i;
const RISK = {
  money: /\b(?:prices?|amounts?|vat|tax(?:es)?|discounts?|cents|currency|invoices?|payments?|refunds?|to Fixed)\b/i,
  parsing: /\b(?:pars(?:e|es|ed|ing)|split|match(?: All)?|Reg Exp|exec|csv|decode)\b/i,
  validation: /\b(?:valid\w*|sanitiz\w*|is Finite|is Na N|is Integer|throw)\b/i,
  security: /\b(?:auth\w*|passwords?|tokens?|secrets?|sql|query|html|escap\w*|encode URI\w*|redirect\w*|uploads?|permissions?|sessions?|cookies?)\b/i,
};

/** A line with its numbers and its texts blanked: two lines that differ only in a value are the same. @param {string} line */
const withoutValues = (line) => tokens(line).map((token) => (/^\d|^['"`]/.test(token) ? '#' : token)).join(' ');

/**
 * Whether a change is more than new values in the same code: 20 members a page made 50 is
 * not logic, and neither is a comment.
 * @param {string | null} before
 * @param {string} after
 */
export function logicChanged(before, after) {
  const gone = linesTakenAway(before ?? '', after).map(withoutValues).sort();
  const come = linesTakenAway(after, before ?? '').map(withoutValues).sort();
  return gone.length !== come.length || gone.some((line, at) => line !== come[at]);
}

/**
 * What a change touches, as words.
 *
 * A change that takes nothing away, a call put round a line or an argument added to it,
 * touches only what it adds: a request wrapped in a retry is about the retry, not about the
 * address the request was already making. A change that rewrites touches everything on the
 * lines it took out and put in. Where a function is written for the first time, in a new
 * file or in the place of a stub, its name counts too: the body of `parseSuppliers` need not
 * say "parse". Names are split where their capitals are: `parseCsv` speaks of parsing and of CSV.
 * @param {string | null} before
 * @param {string} after
 */
function touchedBy(before, after) {
  const gone = linesTakenAway(before ?? '', after);
  const come = new Set(linesTakenAway(after, before ?? ''));
  /** @type {Map<string, number>} */
  const old = new Map();
  for (const token of gone.flatMap(tokens)) old.set(token, (old.get(token) || 0) + 1);
  const added = [...come].flatMap(tokens);
  const fresh = added.filter((token) => {
    const count = old.get(token) || 0;
    if (count) old.set(token, count - 1);
    return !count;
  });
  // What is left of the old lines is what the change took away; a `return` or a bracket that moved is not.
  const rewrote = [...old].some(([token, count]) => count > 0 && /^[A-Za-z_$\d'"`]/.test(token) && token !== 'return');
  const words = rewrote ? [...gone.flatMap(tokens), ...added] : fresh;
  if (before === null || gone.some((line) => STUB.test(line))) {
    const symbols = extract(after).symbols;
    after.split(/\r?\n/).forEach((line, at) => {
      if (come.has(line)) words.push(symbols.filter((symbol) => symbol.line <= at + 1).at(-1)?.name ?? '');
    });
  }
  return words.join(' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/**
 * @param {import('./index/store.mjs').Index} index
 * @param {Left} left
 * @param {ReturnType<typeof changedSource>} changed
 * @returns {Finding[]}
 */
function untested(index, left, changed) {
  // A project with no tests is not given its first one by a check at the end.
  if (!testFacts(index)) return [];
  if ([...left.before].some(([file, before]) => isTest(file) && current(left.root, file) !== before)) return [];
  const fix = FIX.test(left.prompt ?? '');
  for (const { file, before, after } of changed) {
    // A new value is not logic, unless the request says that the old one was a bug: then the value is the fix.
    if (!fix && !logicChanged(before, after)) continue;
    const why = fix ? 'fix' : Object.entries(RISK).find(([, words]) => words.test(touchedBy(before, after)))?.[0];
    if (why) return [{ check: 'test', file, why }];
  }
  return [];
}

// A sentence that says the tests pass, and none of the words of one that says they might.
const CLAIM = /\b(?:tests?|test suite|specs?)\b[^.!?\n]{0,60}\b(?:pass(?:es|ed|ing)?|(?:are|is|all) green)\b|\b(?:las pruebas|los tests?)\b[^.!?\n]{0,60}\bpasan\b|\bpasan\b[^.!?\n]{0,30}\b(?:las pruebas|los tests?)\b/i;
const UNSURE = /\b(?:not|cannot|can't|couldn't|could|unable|should|would|will|may|might|expect\w*|once|if|when|unverified|without|to (?:make|check|confirm|see|verify)|no|sin|deber[ií]an?|podr[ií]an?)\b|n't\b/i;

/**
 * Whether a summary says that the tests pass.
 * @param {string} reply
 */
export function claimsTests(reply) {
  return String(reply).split(/(?<=[.!?])\s+|\n+/).some((sentence) => CLAIM.test(sentence) && !UNSURE.test(sentence));
}

/**
 * Everything the checks that are on find in what a task left. A check that breaks finds nothing.
 * @param {import('./index/store.mjs').Index} index
 * @param {Left} left
 * @param {Record<string, string | undefined>} [env]
 * @returns {Finding[]}
 */
export function findings(index, left, env = process.env) {
  const changed = changedSource(left);
  /** @type {Record<string, () => Finding[]>} */
  const look = {
    deps: () => newDependencies(left),
    twin: () => secondVersions(index, left, changed),
    copy: () => copiesLeft(index, left, changed),
    guard: () => checksLost(changed).slice(0, 2).map(({ file, lines }) => ({ check: 'guard', file, lines })),
    test: () => untested(index, left, changed),
    run: () => (left.shell && !left.tested && changed.length && testFacts(index) ? [{ check: 'run' }] : []),
    claim: () => (!left.tested && changed.length && claimsTests(left.reply ?? '') ? [{ check: 'claim' }] : []),
  };
  const found = checksOn(env).flatMap((name) => {
    try {
      return look[name]();
    } catch {
      return [];
    }
  });
  // Told to run the tests, the agent need not also be told that it said they pass.
  return found.some((finding) => finding.check === 'run') ? found.filter((finding) => finding.check !== 'claim') : found;
}

const code = (/** @type {string} */ text) => `\`${text}\``;
const SAY = {
  en: {
    lead: 'Ockham: before you finish, one look at what this task leaves behind.',
    close: 'Deal with what applies and then finish. If something here is wrong, say so in a line. You will not be asked again.',
    deps: (/** @type {string[]} */ names) => `package.json has ${names.length > 1 ? 'new dependencies' : 'a new dependency'} that the request did not name: ${names.map(code).join(', ')}. If the language or the project already does the job, use that and take ${names.length > 1 ? 'them' : 'it'} out. If ${names.length > 1 ? 'they stay' : 'it stays'}, say why.`,
    twin: (/** @type {string} */ file, /** @type {string} */ name, /** @type {string} */ twin) => `${file} defines ${code(name)}, and the project already has ${twin}. If it does the same job, import that one and take the new one out.`,
    copy: (/** @type {{ file: string, line: number, text: string }} */ place) => `What this task replaced is still in ${place.file}:${place.line}: ${code(place.text)}. If this was a fix, it belongs there too.`,
    guard: (/** @type {string} */ file, /** @type {string[]} */ lines) => `${file} no longer makes ${lines.length > 1 ? 'checks' : 'a check'} it made: ${lines.map(code).join(', ')}. Every check the code made is still made: if a shorter version dropped ${lines.length > 1 ? 'them' : 'it'}, put ${lines.length > 1 ? 'them' : 'it'} back.`,
    test: (/** @type {string} */ file, /** @type {string} */ why) => `This task ${why === 'fix' ? 'fixes a bug' : `changes ${{ money: 'how money is worked out', parsing: 'how text is taken apart', validation: 'what input is accepted', security: 'something an attacker can reach' }[why]}`} in ${file}, and no test was added or changed. Add or extend one test for the case that matters, where the project keeps its tests.`,
    run: 'Source was changed after the last time the tests ran. Run them before you finish.',
    claim: 'Your summary says the tests pass, and they were not run after the last change. Run them, or say that they were not run.',
  },
  es: {
    lead: 'Ockham: antes de terminar, una mirada a lo que deja esta tarea.',
    close: 'Resuelve lo que aplique y termina. Si algo de esto no es cierto, dilo en una línea. No se te volverá a preguntar.',
    deps: (/** @type {string[]} */ names) => `package.json tiene ${names.length > 1 ? 'dependencias nuevas' : 'una dependencia nueva'} que el encargo no nombraba: ${names.map(code).join(', ')}. Si el lenguaje o el proyecto ya hacen ese trabajo, usa eso y ${names.length > 1 ? 'quítalas' : 'quítala'}. Si ${names.length > 1 ? 'se quedan' : 'se queda'}, di por qué.`,
    twin: (/** @type {string} */ file, /** @type {string} */ name, /** @type {string} */ twin) => `${file} define ${code(name)}, y el proyecto ya tiene ${twin}. Si hace el mismo trabajo, importa esa y quita la nueva.`,
    copy: (/** @type {{ file: string, line: number, text: string }} */ place) => `Lo que esta tarea ha sustituido sigue en ${place.file}:${place.line}: ${code(place.text)}. Si era un arreglo, hace falta también allí.`,
    guard: (/** @type {string} */ file, /** @type {string[]} */ lines) => `${file} ya no hace ${lines.length > 1 ? 'comprobaciones que hacía' : 'una comprobación que hacía'}: ${lines.map(code).join(', ')}. Todo lo que el código comprobaba se sigue comprobando: si una versión más corta ${lines.length > 1 ? 'las' : 'la'} ha dejado fuera, vuelve a ${lines.length > 1 ? 'ponerlas' : 'ponerla'}.`,
    test: (/** @type {string} */ file, /** @type {string} */ why) => `Esta tarea ${why === 'fix' ? 'arregla un fallo' : `cambia ${{ money: 'cómo se calcula el dinero', parsing: 'cómo se trocea un texto', validation: 'qué entrada se acepta', security: 'algo que un atacante puede alcanzar' }[why]}`} en ${file}, y no se ha añadido ni cambiado ninguna prueba. Añade o amplía una prueba para el caso que importa, donde el proyecto tiene las suyas.`,
    run: 'Se ha cambiado código después de la última vez que se ejecutaron las pruebas. Ejecútalas antes de terminar.',
    claim: 'Tu resumen dice que las pruebas pasan, y no se han ejecutado después del último cambio. Ejecútalas, o di que no se han ejecutado.',
  },
};

/**
 * What is said to an agent that is about to finish and has left something behind.
 * @param {Finding[]} found
 * @param {string} [language]
 * @returns {string} empty when nothing was found
 */
export function findingsText(found, language) {
  if (!found.length) return '';
  const say = language === 'es' ? SAY.es : SAY.en;
  const lines = found.flatMap((finding) => {
    if (finding.check === 'deps') return [say.deps(finding.names ?? [])];
    if (finding.check === 'twin') return [say.twin(String(finding.file), String(finding.names?.[0]), String(finding.twin))];
    if (finding.check === 'copy') return (finding.places ?? []).map((place) => say.copy(place));
    if (finding.check === 'guard') return [say.guard(String(finding.file), finding.lines ?? [])];
    if (finding.check === 'test') return [say.test(String(finding.file), String(finding.why))];
    return [finding.check === 'run' ? say.run : say.claim];
  });
  return [say.lead, ...lines.map((line) => `- ${line}`), say.close].join('\n');
}
