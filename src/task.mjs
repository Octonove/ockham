// A task, from the request that starts it to the moment the agent means to stop.
//
// The checks at the end compare what the task's files were with what they are, so what they
// were has to be kept. The first time a task writes a file, the file is put aside as it is,
// in the cache folder under the session's name; when the task ends, all of it is removed.
// Four moments, one for each hook that calls in here. Nothing here may stop a hook: every
// failure is swallowed, and a task with no ledger is simply not checked.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { checksOn, dependencies, findings, findingsText } from './checks.mjs';
import { isTest, SOURCE } from './index/scan.mjs';
import { cacheDir, refresh } from './index/store.mjs';
import { record, tell, told } from './journal.mjs';
import { indexOn, language, projectRoot } from './project.mjs';
import { canaryLine } from './session.mjs';

const MAX_KEPT = 300_000;                                     // a file larger than this is not put aside, and so not checked
const STALE_MS = 2 * 24 * 60 * 60 * 1000;                     // the ledger of a session that never stopped goes after two days

/**
 * @param {string | undefined} sessionId
 * @param {Record<string, string | undefined>} env
 */
function taskDir(sessionId, env) {
  const id = /^[A-Za-z0-9_-]{1,80}$/.test(String(sessionId)) ? String(sessionId) : 'unknown';
  return join(cacheDir(env), 'tasks', id);
}

/** @param {string} file @returns {string | null} */
function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** @param {string} dir @returns {{ task: string | null, root: string, prompt: string, deps: string[] | null } | null} */
function readTask(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'task.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** When something happened in a task, as a file that holds the time. @param {string} dir @param {string} name */
const mark = (dir, name) => writeFileSync(join(dir, name), String(Date.now()));
/** @param {string} dir @param {string} name */
const marked = (dir, name) => Number(read(join(dir, name)) ?? 0);

/**
 * A new ledger for the task a request starts, in the place of whatever the session had.
 * @param {Record<string, any>} input
 * @param {Record<string, string | undefined>} env
 * @param {string} root
 * @param {string} prompt
 */
function open(input, env, root, prompt) {
  const dir = taskDir(input.session_id, env);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'files'), { recursive: true });
  writeFileSync(join(dir, 'task.json'), JSON.stringify({ task: input.prompt_id ?? null, root, prompt: prompt.slice(0, 8000), deps: dependencies(read(join(root, 'package.json'))) }));
  // What other sessions left and never came back for.
  const all = join(cacheDir(env), 'tasks');
  for (const name of readdirSync(all)) {
    try {
      if (Date.now() - statSync(join(all, name)).mtimeMs > STALE_MS) rmSync(join(all, name), { recursive: true, force: true });
    } catch {
      // somebody else's ledger, being written or removed right now
    }
  }
  return dir;
}

/**
 * When a request arrives: a task starts. What package.json depends on is noted now, because
 * a dependency can be added by a command that no hook on files sees.
 * @param {Record<string, any>} input  with the prompt
 * @param {Record<string, string | undefined>} env
 */
export function taskStarts(input, env) {
  const root = checksOn(env).length ? projectRoot(input, env) : null;
  if (root) open(input, env, root, String(input.prompt ?? ''));
}

/**
 * When a file is about to be written: it is put aside as it is, the first time in the task.
 * @param {Record<string, any>} input  with tool_input.file_path
 * @param {Record<string, string | undefined>} env
 */
export function taskWrites(input, env) {
  const root = checksOn(env).length ? projectRoot(input, env) : null;
  const target = input.tool_input?.file_path;
  if (!root || typeof target !== 'string') return;
  const file = relative(root, isAbsolute(target) ? target : resolve(root, target)).replace(/\\/g, '/');
  if (file.startsWith('..')) return;
  let dir = taskDir(input.session_id, env);
  const task = readTask(dir);
  // A host that sends no event for a request, or a request whose event was lost: the task starts here.
  if (!task || (input.prompt_id && task.task && task.task !== input.prompt_id)) dir = open(input, env, root, '');
  /** @type {string | null} */
  let before = null;
  try {
    if (statSync(join(root, file)).size > MAX_KEPT) return;
    before = readFileSync(join(root, file), 'utf8');
  } catch {
    // no such file yet: the task is about to make it
  }
  try {
    // Only the first writer gets through: what a file was before the task is what it was before its first write.
    writeFileSync(join(dir, 'files', `${createHash('sha256').update(file).digest('hex').slice(0, 24)}.json`), JSON.stringify({ file, before }), { flag: 'wx' });
  } catch {
    // already put aside
  }
  if (SOURCE.test(file) && !isTest(file)) mark(dir, 'wrote');
}

// A command that speaks of tests runs them, unless all it does is look at files or move them.
const SPEAKS_OF_TESTS = /(?:^|[^A-Za-z])(?:tests?|specs?|jest|vitest|mocha|pytest|ava|playwright|cypress|phpunit|rspec|ctest|tox)(?![A-Za-z])/;
const ONLY_LOOKS = /^(?:cat|ls|dir|grep|rg|find|git|sed|awk|head|tail|wc|echo|mkdir|touch|rm|cp|mv|cd|code|open|type|stat|tree|less|more)$/;

/**
 * Whether a command runs the project's tests: the very command the project's "test" script
 * names, or any part of the line that speaks of tests and does more than look. It errs on
 * the side of yes: a session wrongly told that it ran no tests would run them twice.
 * @param {string} command
 * @param {string} [script]
 */
export function runsTests(command, script = '') {
  if (script.trim().length > 3 && command.includes(script.trim())) return true;
  return command.split(/&&|\|\||[;|\n]/).some((part) => {
    const words = part.trim().split(/\s+/);
    // What comes first may set a variable or call through npx: the program is what follows.
    const program = words.find((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word) && !/^(?:npx|sudo|time|env)$/.test(word)) ?? '';
    return !ONLY_LOOKS.test(program) && SPEAKS_OF_TESTS.test(part);
  });
}

/**
 * When a command has run: the session has a shell, which is remembered for as long as the
 * session lasts, and if the command ran the tests, the task has been tested as of now.
 * @param {Record<string, any>} input  with tool_input.command
 * @param {Record<string, string | undefined>} env
 */
export function taskRuns(input, env) {
  if (!checksOn(env).length || input.tool_name !== 'Bash') return;
  if (!told(input.session_id, env).has('shell')) tell(input.session_id, ['shell'], env);
  const dir = taskDir(input.session_id, env);
  const task = readTask(dir);
  if (!task) return;
  let script = '';
  try {
    script = String(JSON.parse(read(join(task.root, 'package.json')) ?? '{}').scripts?.test ?? '');
  } catch {
    // a project without a package.json has no script to look for
  }
  if (runsTests(String(input.tool_input?.command ?? ''), script)) mark(dir, 'tested');
}

/**
 * When the agent means to stop: one look at what the task leaves behind. If there is
 * something, the agent is told and goes on, once: the second time it means to stop, it
 * stops, whatever is left. Then the ledger is removed.
 * @param {Record<string, any>} input  with stop_hook_active and last_assistant_message
 * @param {Record<string, string | undefined>} env
 * @returns {string} what the agent is told; empty lets it stop
 */
export function taskEnds(input, env) {
  if (!checksOn(env).length) return '';
  const dir = taskDir(input.session_id, env);
  const task = readTask(dir);
  if (!task) return '';
  /** @type {Map<string, string | null>} */
  const before = new Map();
  for (const name of existsSync(join(dir, 'files')) ? readdirSync(join(dir, 'files')) : []) {
    try {
      const kept = JSON.parse(readFileSync(join(dir, 'files', name), 'utf8'));
      before.set(kept.file, kept.before);
    } catch {
      // half written by a hook that was cut short: that file is not checked
    }
  }
  const said = told(input.session_id, env);
  // Without the index there is nothing to say where a copy is or whether the project has tests.
  const index = indexOn(env) ? refresh(task.root, { env, budgetMs: 400 }).index : { version: 0, root: task.root, complete: false, files: {} };
  const found = findings(index, {
    root: task.root, before, deps: task.deps, prompt: task.prompt, told: said,
    shell: said.has('shell'), tested: marked(dir, 'tested') > 0 && marked(dir, 'tested') >= marked(dir, 'wrote'), reply: String(input.last_assistant_message ?? ''),
  }, env);
  // Somebody has already kept this agent from stopping, we or another hook: it is not kept twice.
  const again = Boolean(input.stop_hook_active) || existsSync(join(dir, 'held'));
  if (again || !found.length) {
    if (existsSync(join(dir, 'held'))) record({ event: 'checked', root: task.root, session: input.session_id, left: found.map((finding) => finding.check) }, env);
    rmSync(dir, { recursive: true, force: true });
    return '';
  }
  mark(dir, 'held');
  record({ event: 'check', root: task.root, session: input.session_id, checks: found.map((finding) => finding.check) }, env);
  return [findingsText(found, language(env)), canaryLine(env.OCKHAM_STOP_CANARY, 'stop word')].filter(Boolean).join('\n\n');
}
