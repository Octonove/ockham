// What Ockham says to an agent: its rules, in the user's language. A session gets the
// full text when it starts; an agent it hands work to gets the compact one.
import { readFileSync } from 'node:fs';

const CANARY = /^[A-Za-z0-9-]{1,40}$/;
const LANGUAGES = ['en', 'es'];

/**
 * The ruleset in one language and one size. An unknown language gets English; a file
 * that cannot be read gives '' and the agent goes on without rules.
 * @param {string} [language]
 * @param {string} [size]  'full' or 'compact'
 * @returns {string}
 */
export function rules(language = 'en', size = 'full') {
  const lang = LANGUAGES.includes(language) ? language : 'en';
  const name = size === 'compact' ? `ockham.compact.${lang}.md` : `ockham.${lang}.md`;
  try {
    return readFileSync(new URL(`../rules/${name}`, import.meta.url), 'utf8').trim();
  } catch {
    return '';
  }
}

/**
 * A ruleset without its rule about tests: rule 7 and the heading over it. The other
 * rules keep their numbers.
 * @param {string} text
 */
function withoutTests(text) {
  return text.replace(/^(?:Tests|Pruebas)\n(?=7\.)/m, '').replace(/^7\..*\n?/m, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * The rules an environment asks for. OCKHAM_RULES=off gives none; =full and =compact
 * pick a size for everybody; anything else leaves the size to the caller.
 * OCKHAM_LANG picks the language. OCKHAM_TESTS=off leaves out the rule that asks for a
 * test: tests are most of what a session with Ockham costs, and not everybody wants
 * them written for them.
 * @param {Record<string, string | undefined>} env
 * @param {string} size
 */
export function rulesFor(env, size) {
  const asked = String(env.OCKHAM_RULES || '').trim().toLowerCase();
  if (asked === 'off') return '';
  const language = String(env.OCKHAM_LANG || 'en').trim().toLowerCase().slice(0, 2);
  const text = rules(language, asked === 'full' || asked === 'compact' ? asked : size);
  return String(env.OCKHAM_TESTS || '').trim().toLowerCase() === 'off' ? withoutTests(text) : text;
}

/**
 * The line a contract test looks for: the only proof that a host really delivered a
 * hook's output to the model. Only a word of letters, digits and dashes is repeated.
 * @param {string | undefined} word
 * @param {string} label
 */
function canaryLine(word, label) {
  const canary = String(word || '').trim();
  return CANARY.test(canary) ? `Ockham contract test. The ${label} is ${canary}.` : '';
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string} the text for a session that starts; empty means say nothing
 */
export function sessionContext(env) {
  return [rulesFor(env, 'full'), canaryLine(env.OCKHAM_CANARY, 'canary word')].filter(Boolean).join('\n\n');
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string} the text for a subagent that starts; empty means say nothing
 */
export function subagentContext(env) {
  return [rulesFor(env, 'compact'), canaryLine(env.OCKHAM_SUBAGENT_CANARY, 'subagent canary word')].filter(Boolean).join('\n\n');
}
