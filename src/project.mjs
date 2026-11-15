// What Ockham tells an agent about the project it is working in: what it already has.
// Three moments, one for each hook that calls in here.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, parse, relative, resolve } from 'node:path';

import { copiesOf } from './index/copies.mjs';
import { definitionsIn, digest, hintsFor, twinsOf } from './index/lookup.mjs';
import { copiesText, describe, digestText, hintText, testsText, twinText } from './index/say.mjs';
import { isTest, SOURCE } from './index/scan.mjs';
import { refresh } from './index/store.mjs';
import { record, tell, told } from './journal.mjs';

// What is on when nobody says. A part is on only when a measurement said that it helps:
// what a request brings up was mostly noise; where the tests are took a sixth off the
// cost of a session and lost nothing (docs/index.md).
const HINTS_BY_DEFAULT = false;
const FACTS_BY_DEFAULT = true;
// How the helpers are listed when a session starts (OCKHAM_LIST): 'full' says what each one
// does, 'map' only where each one is and how it is called, 'off' lists none. The list is
// carried by every call a session makes, so its length is paid for again and again.
const LIST_BY_DEFAULT = 'full';
const LISTS = ['full', 'map', 'off'];

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string} one of LISTS
 */
export function listFormat(env) {
  const asked = String(env.OCKHAM_LIST || '').trim().toLowerCase();
  return LISTS.includes(asked) ? asked : LIST_BY_DEFAULT;
}

/**
 * OCKHAM_INDEX=off switches off everything that comes from the index.
 * @param {Record<string, string | undefined>} env
 */
export const indexOn = (env) => String(env.OCKHAM_INDEX || '').trim().toLowerCase() !== 'off';

/**
 * One part of what the index says, switched by its own variable: OCKHAM_HINTS for what a
 * request brings up, OCKHAM_FACTS for where the tests are.
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {boolean} byDefault
 */
function switched(env, name, byDefault) {
  const value = String(env[name] || '').trim().toLowerCase();
  return value === 'on' ? true : value === 'off' ? false : byDefault;
}

/**
 * Whether a request is looked up at all. It is not, as shipped: the hook can leave
 * without reading its input.
 * @param {Record<string, string | undefined>} env
 */
export const hintsOn = (env) => indexOn(env) && switched(env, 'OCKHAM_HINTS', HINTS_BY_DEFAULT);

/** @param {Record<string, string | undefined>} env */
const language = (env) => String(env.OCKHAM_LANG || 'en').trim().toLowerCase().slice(0, 2);

/**
 * What the project's "test" script runs, or '' if it has none.
 * @param {string} root
 */
function testScript(root) {
  try {
    const script = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts?.test;
    // The placeholder npm writes for a project without tests says nothing.
    return typeof script === 'string' && !/no test specified/.test(script) ? script.slice(0, 120) : '';
  } catch {
    return '';
  }
}

/**
 * The folder of the project: what the host says in the hook's input, or in its
 * environment, or where the hook was started. Null for a folder that is no project:
 * the user's home or the top of a disk, where indexing would mean reading everything.
 * @param {Record<string, any>} input
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function projectRoot(input, env) {
  const root = resolve(String(input.cwd || env.CLAUDE_PROJECT_DIR || process.cwd()));
  if (root === parse(root).root || root === resolve(homedir())) return null;
  return root;
}

/**
 * How a file begins: its first lines, as far as its first test goes. Enough to show the
 * style of a project's tests without the agent opening one.
 * @param {string} root
 * @param {string} file
 */
function headOf(root, file) {
  try {
    const lines = readFileSync(join(root, file), 'utf8').split(/\r?\n/).slice(0, 40);
    /** @type {string[]} */
    const kept = [];
    let chars = 0;
    for (const line of lines) {
      if (kept.length >= 14 || chars + line.length > 700) break;
      kept.push(line);
      chars += line.length;
      // A line that closes a block at the left margin ends the first test.
      if (/^\}\);?\s*$/.test(line) && kept.some((one) => /\b(?:test|it|describe)\(/.test(one))) break;
    }
    while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
    return kept.join('\n');
  } catch {
    return '';
  }
}

/**
 * When a session starts: the helpers the project's files share, and where its tests are.
 * @param {Record<string, any>} input
 * @param {Record<string, string | undefined>} env
 * @returns {string} empty means say nothing
 */
export function sharedContext(input, env) {
  const root = indexOn(env) ? projectRoot(input, env) : null;
  if (!root) return '';
  const { index } = refresh(root, { env, budgetMs: 1500 });
  const list = listFormat(env);
  const shared = list === 'off' ? '' : digestText(index, language(env), list);
  // Nobody who has asked for no tests wants to be shown how the project writes them.
  const wanted = switched(env, 'OCKHAM_FACTS', FACTS_BY_DEFAULT) && String(env.OCKHAM_TESTS || '').trim().toLowerCase() !== 'off';
  const tests = wanted ? testsText(index, { script: testScript(root), head: (file) => headOf(root, file), language: language(env) }) : '';
  if (shared || tests) record({ event: 'shared', root, session: input.session_id, list, helpers: shared ? digest(index).length : 0, tests: Boolean(tests) }, env);
  return [shared, tests].filter(Boolean).join('\n\n');
}

/**
 * When a request arrives: what the project already has for it, less what this session
 * has been shown before.
 * @param {Record<string, any>} input  with the prompt
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function requestContext(input, env) {
  const root = hintsOn(env) && input.prompt ? projectRoot(input, env) : null;
  if (!root) return '';
  const { index } = refresh(root, { env, budgetMs: 300 });
  const seen = told(input.session_id, env);
  const key = (/** @type {import('./index/lookup.mjs').Found} */ found) => `hint:${found.file}#${found.name}`;
  const hints = hintsFor(index, String(input.prompt)).filter((found) => !seen.has(key(found)));
  if (!hints.length) return '';
  tell(input.session_id, hints.map(key), env);
  record({ event: 'hint', root, session: input.session_id, symbols: hints.map((found) => `${found.file}#${found.name}`) }, env);
  return hintText(hints, language(env));
}

/**
 * The pieces of source text a tool call is about to put in a file, and what was there.
 * @param {Record<string, any>} input
 * @returns {{ after: string, before: string | null }[]} before is null when the whole file is written
 */
function writes(input) {
  const args = input.tool_input ?? {};
  if (input.tool_name === 'Write') return [{ after: String(args.content ?? ''), before: null }];
  if (input.tool_name === 'Edit') return [{ after: String(args.new_string ?? ''), before: String(args.old_string ?? '') }];
  if (input.tool_name === 'MultiEdit' && Array.isArray(args.edits)) {
    return args.edits.map((/** @type {Record<string, any>} */ edit) => ({ after: String(edit.new_string ?? ''), before: String(edit.old_string ?? '') }));
  }
  return [];
}

// How many times a session is told that what it replaces is somewhere else too.
const COPY_NOTES = 2;

/**
 * When source is written, two things are looked up and said if found:
 *   - the change defines something the project already exports elsewhere (once a session);
 *   - what the change replaces is in other files too, so a fix may belong there as well.
 * Neither stops the change, and nothing is said twice.
 * @param {Record<string, any>} input  with tool_name and tool_input
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function writeContext(input, env) {
  const root = indexOn(env) ? projectRoot(input, env) : null;
  const target = input.tool_input?.file_path;
  if (!root || typeof target !== 'string') return '';
  const file = relative(root, isAbsolute(target) ? target : resolve(root, target)).replace(/\\/g, '/');
  if (file.startsWith('..') || !SOURCE.test(file) || isTest(file)) return '';

  const { index } = refresh(root, { env, budgetMs: 200 });
  const seen = told(input.session_id, env);
  const lang = language(env);
  /** @type {string[]} */
  const said = [];
  /** @type {string[]} */
  const keys = [];

  const had = new Set((index.files[file]?.symbols ?? []).map((symbol) => symbol.name));
  const fresh = [];
  /** @type {{ file: string, line: number, text: string }[]} */
  const places = [];
  for (const { after, before } of writes(input)) {
    const gone = new Set(before === null ? had : definitionsIn(before).map((definition) => definition.name));
    for (const definition of definitionsIn(after)) if (!gone.has(definition.name)) fresh.push(definition);
    // A whole file written over an existing one replaces what that file had.
    const replaced = before ?? (index.files[file] ? currentText(root, file) : '');
    if (replaced) places.push(...copiesOf(index, root, file, replaced, after));
  }

  const [twin] = twinsOf(index, file, fresh);
  if (twin && ![...seen].some((key) => key.startsWith('twin:'))) {
    keys.push(`twin:${file}#${twin.name}`);
    record({ event: 'twin', root, session: input.session_id, file, name: twin.name, twin: `${twin.twin.file}#${twin.twin.name}` }, env);
    said.push(twinText(twin.name, file, twin.twin, lang));
  }

  const room = COPY_NOTES - [...seen].filter((key) => key.startsWith('copy-note:')).length;
  const unseen = places.filter((place, at) => !seen.has(`copy:${place.file}:${place.line}`) && places.findIndex((other) => other.file === place.file && other.line === place.line) === at).slice(0, 2);
  if (unseen.length && room > 0) {
    keys.push(`copy-note:${seen.size}`, ...unseen.map((place) => `copy:${place.file}:${place.line}`));
    record({ event: 'copy', root, session: input.session_id, file, places: unseen.map((place) => `${place.file}:${place.line}`) }, env);
    said.push(copiesText(unseen, lang));
  }

  if (keys.length) tell(input.session_id, keys, env);
  return said.join('\n\n');
}

/**
 * @param {string} root
 * @param {string} file
 */
function currentText(root, file) {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return '';
  }
}

export { describe };
