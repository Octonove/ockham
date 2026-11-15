// What Ockham says with what it finds in the index. The findings are code and stay as
// they are; the sentences round them are in the user's language.
import { digest, testFacts } from './lookup.mjs';

/** @typedef {NonNullable<ReturnType<typeof testFacts>>} TestFacts */

const SAY = {
  en: {
    shared: 'Ockham: what this project already has, so that you do not have to look for it. These are the helpers its files share:',
    sharedMap: 'Ockham: what this project already has, so that you do not have to look for it. These are the helpers its files share, file by file:',
    request: 'Ockham: for this request, the project already has:',
    tests: (/** @type {TestFacts} */ facts, /** @type {string} */ script, /** @type {string} */ head) =>
      `Ockham: this project's tests ${facts.beside ? 'sit beside the code they test' : `are in ${facts.folder}/`} (${facts.count} of them)${facts.runner ? `, written with ${facts.runner}` : ''}${script ? `; \`npm test\` runs \`${script}\`` : ''}. A new test goes with them, in their style.${head ? ` So that you do not have to open one to see that style, this is how ${facts.sample} begins:\n${head}` : ''}`,
    twin: (/** @type {string} */ name, /** @type {string} */ file, /** @type {string} */ twin) =>
      `Ockham: this change defines \`${name}\` in ${file}, and the project already has ${twin}. If it does the same job, import that one and take the new one out.`,
    copies: ['Ockham: what this change replaces is also in', 'If this is a fix, it belongs there too.'],
  },
  es: {
    shared: 'Ockham: lo que este proyecto ya tiene, para que no tengas que buscarlo. Estas son las funciones que comparten sus ficheros:',
    sharedMap: 'Ockham: lo que este proyecto ya tiene, para que no tengas que buscarlo. Estas son las funciones que comparten sus ficheros, fichero a fichero:',
    request: 'Ockham: para este encargo, el proyecto ya tiene:',
    tests: (/** @type {TestFacts} */ facts, /** @type {string} */ script, /** @type {string} */ head) =>
      `Ockham: las pruebas de este proyecto ${facts.beside ? 'están junto al código que prueban' : `están en ${facts.folder}/`} (${facts.count})${facts.runner ? `, escritas con ${facts.runner}` : ''}${script ? `; \`npm test\` ejecuta \`${script}\`` : ''}. Una prueba nueva va con ellas, en su estilo.${head ? ` Para que no tengas que abrir una para ver ese estilo, así empieza ${facts.sample}:\n${head}` : ''}`,
    twin: (/** @type {string} */ name, /** @type {string} */ file, /** @type {string} */ twin) =>
      `Ockham: este cambio define \`${name}\` en ${file}, y el proyecto ya tiene ${twin}. Si hace el mismo trabajo, importa esa y quita la nueva.`,
    copies: ['Ockham: lo que este cambio sustituye está también en', 'Si es un arreglo, hace falta también allí.'],
  },
};

/** @param {string} [language] */
const phrases = (language) => (language === 'es' ? SAY.es : SAY.en);

/**
 * A symbol as it is called: its name and what it takes, nothing about what it does.
 * @param {import('./lookup.mjs').Found} found
 */
function signature(found) {
  return found.kind === 'function' ? `${found.name}(${found.params ?? ''})`
    : found.kind === 'class' ? `class ${found.name}`
      : found.value ? `${found.name} = ${found.value}` : found.name;
}

/**
 * A symbol as a reader of code would write it down.
 * @param {import('./lookup.mjs').Found} found
 * @param {{ line?: boolean }} [options]
 */
export function describe(found, { line = false } = {}) {
  const where = line ? `${found.file}:${found.line}` : found.file;
  return `${signature(found)} in ${where}${found.doc ? ` - ${found.doc}` : ''}`;
}

/**
 * The list a session gets at its start.
 * @param {import('./store.mjs').Index} index
 * @param {string} [language]
 * @param {string} [format]  'full': every helper with the first sentence of its comment;
 *   'map': every file with the names and parameters of its helpers, at a quarter of the length
 * @returns {string} empty when the project shares nothing worth listing
 */
export function digestText(index, language, format = 'full') {
  const shared = digest(index);
  if (!shared.length) return '';
  const say = phrases(language);
  if (format !== 'map') return [say.shared, ...shared.map((found) => `- ${describe(found)}`)].join('\n');
  /** @type {Map<string, string[]>} */
  const byFile = new Map();
  for (const found of shared) byFile.set(found.file, [...(byFile.get(found.file) ?? []), signature(found)]);
  return [say.sharedMap, ...[...byFile].map(([file, names]) => `- ${file}: ${names.join(', ')}`)].join('\n');
}

/**
 * @param {import('./store.mjs').Index} index
 * @param {{ script?: string, head?: (file: string) => string, language?: string }} [options]
 *   script: what the project's "test" script runs; head: how a test file begins
 * @returns {string} empty when the project has no tests
 */
export function testsText(index, { script = '', head, language } = {}) {
  const facts = testFacts(index);
  return facts ? phrases(language).tests(facts, script, head ? head(facts.sample) : '') : '';
}

/**
 * @param {import('./lookup.mjs').Found[]} hints
 * @param {string} [language]
 */
export function hintText(hints, language) {
  return [phrases(language).request, ...hints.map((found) => `- ${describe(found, { line: true })}`)].join('\n');
}

/**
 * @param {{ file: string, line: number, text: string }[]} places
 * @param {string} [language]
 */
export function copiesText(places, language) {
  const [lead, close] = phrases(language).copies;
  return [`${lead}${places.length > 1 ? ':' : ` ${places[0].file}:${places[0].line}:`}`,
    ...places.map((place) => (places.length > 1 ? `- ${place.file}:${place.line}: ${place.text}` : `    ${place.text}`)), close].join('\n');
}

/**
 * @param {string} name   what the change defines
 * @param {string} file   where
 * @param {import('./lookup.mjs').Found} twin
 * @param {string} [language]
 */
export function twinText(name, file, twin, language) {
  return phrases(language).twin(name, file, describe(twin, { line: true }).replace(/ - .*$/, ''));
}
