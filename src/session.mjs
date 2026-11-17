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
 * Whether the part about tests is on: rule 7, where the project keeps its tests, and the
 * check at the end that asks for a missing one. It ships off and OCKHAM_TESTS=on turns it
 * on: tests are most of what a session with Ockham costs, and not everybody wants them
 * written for them (D23).
 * @param {Record<string, string | undefined>} env
 */
export const testsOn = (env) => String(env.OCKHAM_TESTS || '').trim().toLowerCase() === 'on';

/**
 * The rules an environment asks for. OCKHAM_RULES=off gives none; =full and =compact
 * pick a size for everybody; anything else leaves the size to the caller.
 * OCKHAM_LANG picks the language. Without OCKHAM_TESTS=on the rule that asks for a test
 * is left out.
 * @param {Record<string, string | undefined>} env
 * @param {string} size
 */
export function rulesFor(env, size) {
  const asked = String(env.OCKHAM_RULES || '').trim().toLowerCase();
  if (asked === 'off') return '';
  const language = String(env.OCKHAM_LANG || 'en').trim().toLowerCase().slice(0, 2);
  const text = rules(language, asked === 'full' || asked === 'compact' ? asked : size);
  return testsOn(env) ? text : withoutTests(text);
}

const TESTS_NOTICE = {
  en: 'Ockham is on. Its part about writing tests ships off. With OCKHAM_TESTS=on, the agent adds or extends a test whenever a change touches money, reading data, validation or security, or fixes a bug, and before it finishes Ockham checks that it did. What you get is a test that guards the change from then on; what it costs is time and tokens: in the Ockham benchmark a session with the test rule cost about a third more and passed the same hidden checks. To turn it on, set OCKHAM_TESTS=on: in Claude Code, "env": { "OCKHAM_TESTS": "on" } in ~/.claude/settings.json; in Codex, an environment variable; OCKHAM_TESTS=off keeps it off. This notice goes away once you choose one.',
  es: 'Ockham está activo. Su parte de escribir pruebas viene apagada. Con OCKHAM_TESTS=on, el agente añade o amplía una prueba cada vez que un cambio toca dinero, lectura de datos, validación o seguridad, o arregla un fallo, y antes de terminar Ockham comprueba que lo ha hecho. Lo que ganas es una prueba que protege ese cambio en adelante; lo que cuesta es tiempo y tokens: en el banco de Ockham, una sesión con la regla de pruebas costó un tercio más y pasó las mismas comprobaciones ocultas. Para activarla, pon OCKHAM_TESTS=on: en Claude Code, "env": { "OCKHAM_TESTS": "on" } en ~/.claude/settings.json; en Codex, como variable de entorno; OCKHAM_TESTS=off la deja apagada. Este aviso desaparece cuando eliges una de las dos.',
};

/**
 * What the user is told about the part about tests: that it is off, what turning it on gives
 * and how. It is said at the start of every session until the user chooses, OCKHAM_TESTS=on
 * or =off: told only once, it goes to whichever session starts first, and on a machine that runs
 * scheduled tasks that can be one nobody reads.
 * @param {Record<string, string | undefined>} env
 */
export function testsNotice(env) {
  const chosen = String(env.OCKHAM_TESTS || '').trim().toLowerCase();
  if (chosen === 'on' || chosen === 'off') return '';
  const language = String(env.OCKHAM_LANG || 'en').trim().toLowerCase().slice(0, 2);
  return TESTS_NOTICE[language === 'es' ? 'es' : 'en'];
}

/**
 * The line a contract test looks for: the only proof that a host really delivered a
 * hook's output to the model. Only a word of letters, digits and dashes is repeated.
 * @param {string | undefined} word
 * @param {string} label
 */
export function canaryLine(word, label) {
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
