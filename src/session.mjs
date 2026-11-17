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
  en: [
    'Ockham is on. Its part about writing tests ships off, so that a session costs less. You choose:',
    '- On (OCKHAM_TESTS=on): when a change touches money, reading data, validation or security, or fixes a bug, the agent adds or extends a test, and Ockham checks before it finishes that it did. Better: that change keeps a test that guards it from then on; in the Ockham benchmark nine sessions in ten that needed a test left one. Worse: a session costs about a third more, and takes longer.',
    '- Off (OCKHAM_TESTS=off, as it ships): a session costs about a quarter less and passes the same hidden checks. Worse: those changes are mostly left without a test, so if a later change breaks them, no test says so. Ockham still asks for the tests the project already has to be run.',
    'Set it in Claude Code with "env": { "OCKHAM_TESTS": "on" } (or "off") in ~/.claude/settings.json, and in Codex as an environment variable. This notice goes away once you choose.',
  ].join('\n'),
  es: [
    'Ockham está activo. Su parte de escribir pruebas viene apagada, para que cada sesión cueste menos. Tú eliges:',
    '- Activada (OCKHAM_TESTS=on): cuando un cambio toca dinero, lectura de datos, validación o seguridad, o arregla un fallo, el agente añade o amplía una prueba, y Ockham comprueba antes de terminar que lo ha hecho. Mejora: ese cambio queda protegido por una prueba en adelante; en el banco de Ockham, nueve de cada diez sesiones que necesitaban prueba la dejaron. Empeora: cada sesión cuesta un tercio más y tarda más.',
    '- Apagada (OCKHAM_TESTS=off, como viene): cada sesión cuesta una cuarta parte menos y pasa las mismas comprobaciones ocultas. Empeora: esos cambios se quedan casi siempre sin prueba, así que si otro cambio los rompe más adelante, ninguna prueba lo avisa. Ockham sigue pidiendo que se ejecuten las pruebas que el proyecto ya tiene.',
    'Se pone en Claude Code con "env": { "OCKHAM_TESTS": "on" } (u "off") en ~/.claude/settings.json, y en Codex como variable de entorno. Este aviso desaparece cuando eliges.',
  ].join('\n'),
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
