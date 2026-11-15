// What Ockham says when a session starts: its rules, in the user's language.
import { readFileSync } from 'node:fs';

const CANARY = /^[A-Za-z0-9-]{1,40}$/;
const LANGUAGES = ['en', 'es'];

/**
 * The ruleset in one language. An unknown language gets English; a file that cannot
 * be read gives '' and the session goes on without rules.
 * @param {string} [language]
 * @returns {string}
 */
export function rules(language = 'en') {
  const lang = LANGUAGES.includes(language) ? language : 'en';
  try {
    return readFileSync(new URL(`../rules/ockham.${lang}.md`, import.meta.url), 'utf8').trim();
  } catch {
    return '';
  }
}

/**
 * @param {Record<string, string | undefined>} env
 *   OCKHAM_RULES=off switches the rules off; OCKHAM_LANG picks their language.
 * @returns {string} the text for the model; empty means say nothing
 */
export function sessionContext(env) {
  /** @type {string[]} */
  const parts = [];
  if (String(env.OCKHAM_RULES || '').trim().toLowerCase() !== 'off') {
    parts.push(rules(String(env.OCKHAM_LANG || 'en').trim().toLowerCase().slice(0, 2)));
  }
  const canary = String(env.OCKHAM_CANARY || '').trim();
  // The contract test sets a canary word and asks the model for it: the only proof
  // that a host really delivered this hook's output to the model.
  if (CANARY.test(canary)) parts.push(`Ockham contract test. The canary word is ${canary}.`);
  return parts.filter(Boolean).join('\n\n');
}
