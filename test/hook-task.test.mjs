import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readJournal } from '../src/journal.mjs';
import { runsTests, taskEnds, taskRuns, taskStarts, taskWrites } from '../src/task.mjs';

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

const FILES = {
  'package.json': '{ "name": "shop", "type": "module", "scripts": { "test": "node --test test/" }, "dependencies": {} }',
  'src/prices/shelf.js': 'const RATE = 0.21;\n\nexport function shelfPrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
  'src/prices/quote.js': 'const RATE = 0.21;\n\nexport function quotePrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
  'test/shelf.test.js': "import { test } from 'node:test';\ntest('a price', () => {});\n",
};
const ROUNDED = FILES['src/prices/shelf.js'].replace('Math.floor', 'Math.round');

/** A project on disk, a session in it, and an environment that keeps everything Ockham writes next to it. */
function project() {
  const base = mkdtempSync(join(tmpdir(), 'ockham-task-test-'));
  made.push(base);
  const root = join(base, 'project');
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  const env = { OCKHAM_CACHE_DIR: join(base, 'cache') };
  const session = { session_id: 'session-1', cwd: root };
  /** The agent writes a file: the hook first, then the file. @param {string} rel @param {string} text */
  const write = (rel, text, extra = {}) => {
    taskWrites({ ...session, ...extra, tool_name: 'Write', tool_input: { file_path: join(root, rel), content: text } }, env);
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  return { root, env, session, write, ledger: join(base, 'cache', 'tasks', 'session-1') };
}

/**
 * Run a hook the way a host does: its input on a stdin that is never closed.
 * @param {string} name
 * @param {Record<string, any> | string} input
 * @param {Record<string, string>} env
 * @returns {Promise<{ code: number | null, stdout: string, ms: number }>}
 */
function runHook(name, input, env) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const hook = fileURLToPath(new URL(`../hooks/${name}.mjs`, import.meta.url));
    const child = spawn(process.execPath, [hook], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('the hook did not exit')); }, 15_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, ms: Date.now() - started }); });
    child.stdin.write(typeof input === 'string' ? input : JSON.stringify(input));
  });
}

test('a task that leaves a copy unfixed is stopped once, told where, and then let go', () => {
  // As shipped the part about tests is on, so the missing test is asked for too.
  const { env, session, write, ledger } = project();
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Bug: 19.99 shows as 24.18. Fix the rounding.' }, env);
  write('src/prices/shelf.js', ROUNDED, { prompt_id: 'p1' });
  const said = taskEnds({ ...session, stop_hook_active: false, last_assistant_message: 'Fixed.' }, env);
  assert.match(said, /^Ockham: before you finish/);
  assert.match(said, /src\/prices\/quote\.js:4/);
  assert.match(said, /fixes a bug in src\/prices\/shelf\.js, and no test was added/);
  assert.match(said, /You will not be asked again\.$/);
  // The agent goes on, fixes the other place, leaves the test, and means to stop again.
  write('src/prices/quote.js', FILES['src/prices/quote.js'].replace('Math.floor', 'Math.round'), { prompt_id: 'p1' });
  assert.equal(taskEnds({ ...session, stop_hook_active: true, last_assistant_message: 'Fixed in both.' }, env), '');
  assert.ok(!existsSync(ledger), 'the ledger is removed when the task ends');
  const events = readJournal(env).filter((event) => event.event.startsWith('check'));
  assert.deepEqual(events.map((event) => [event.event, event.checks ?? event.left]), [['check', ['copy', 'test']], ['checked', ['test']]]);
});

test('with the tests off, the same task is stopped for the copy and is not asked for a test', () => {
  const { env: cache, session, write } = project();
  const env = { ...cache, OCKHAM_TESTS: 'off' };
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Bug: 19.99 shows as 24.18. Fix the rounding.' }, env);
  write('src/prices/shelf.js', ROUNDED, { prompt_id: 'p1' });
  const said = taskEnds({ ...session, stop_hook_active: false, last_assistant_message: 'Fixed.' }, env);
  assert.match(said, /src\/prices\/quote\.js:4/);
  assert.doesNotMatch(said, /no test was added/);
  assert.deepEqual(readJournal(env).filter((event) => event.event === 'check').map((event) => event.checks), [['copy']]);
});

test('a task that leaves nothing behind is not stopped, and neither is one that only read', () => {
  const { env, session, write, ledger } = project();
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Say in a comment what the rate is.' }, env);
  write('src/prices/shelf.js', `// The VAT rate.\n${FILES['src/prices/shelf.js']}`);
  assert.equal(taskEnds({ ...session, stop_hook_active: false }, env), '');
  assert.ok(!existsSync(ledger));
  taskStarts({ ...session, prompt_id: 'p2', prompt: 'What does shelfPrice do?' }, env);
  assert.equal(taskEnds({ ...session, stop_hook_active: false }, env), '');
  assert.deepEqual(readJournal(env).filter((event) => event.event.startsWith('check')), []);
});

test('what a file was is what it was before the task first wrote it, however many times it is written', () => {
  const { env, session, write } = project();
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Try something.' }, env);
  write('src/prices/shelf.js', ROUNDED);
  write('src/prices/shelf.js', FILES['src/prices/shelf.js']);           // and back again: nothing changed after all
  assert.equal(taskEnds({ ...session, stop_hook_active: false }, env), '');
});

test('a new request starts a new task: what the last one wrote is not held against this one', () => {
  const { env, session, write } = project();
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Round instead of flooring in the shelf price only.' }, env);
  write('src/prices/shelf.js', ROUNDED);
  taskStarts({ ...session, prompt_id: 'p2', prompt: 'Thanks. What is the rate?' }, env);
  assert.equal(taskEnds({ ...session, stop_hook_active: false }, env), '');
  // And where the host sends no event for the request, the first write of it starts the task.
  write('src/prices/quote.js', FILES['src/prices/quote.js'].replace('0.21', '0.10'), { prompt_id: 'p3' });
  write('src/prices/shelf.js', ROUNDED.replace('0.21', '0.10'), { prompt_id: 'p4' });
  const kept = readdirSync(join(env.OCKHAM_CACHE_DIR, 'tasks', 'session-1', 'files'));
  assert.equal(kept.length, 1, 'only the file written since the last request is kept');
});

test('an agent that somebody else already kept from stopping is not kept again', () => {
  const { env, session, write, ledger } = project();
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Bug: fix the rounding.' }, env);
  write('src/prices/shelf.js', ROUNDED);
  assert.equal(taskEnds({ ...session, stop_hook_active: true }, env), '');
  assert.ok(!existsSync(ledger));
});

test('with the checks off nothing is kept and nothing is said', () => {
  const { root, env, session } = project();
  const off = { ...env, OCKHAM_CHECKS: 'off' };
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Bug: fix the rounding.' }, off);
  taskWrites({ ...session, tool_name: 'Write', tool_input: { file_path: join(root, 'src/prices/shelf.js'), content: ROUNDED } }, off);
  writeFileSync(join(root, 'src/prices/shelf.js'), ROUNDED);
  taskRuns({ ...session, tool_name: 'Bash', tool_input: { command: 'git status' } }, off);
  assert.equal(taskEnds({ ...session, stop_hook_active: false }, off), '');
  assert.ok(!existsSync(join(env.OCKHAM_CACHE_DIR, 'tasks')), 'no ledger is kept');
});

test('a session with a shell is asked to run the tests it did not run after its last change', () => {
  const { root, env, session, write } = project();
  const only = { ...env, OCKHAM_CHECKS: 'run' };
  taskStarts({ ...session, prompt_id: 'p1', prompt: 'Round the shelf price.' }, only);
  taskRuns({ ...session, tool_name: 'Bash', tool_input: { command: 'git status' } }, only);
  write('src/prices/shelf.js', ROUNDED);
  assert.match(taskEnds({ ...session, stop_hook_active: false }, only), /Run them before you finish/);
  // The same task with the tests run after the change.
  taskStarts({ ...session, prompt_id: 'p2', prompt: 'And the quote.' }, only);
  writeFileSync(join(root, 'src/prices/quote.js'), FILES['src/prices/quote.js']);
  taskWrites({ ...session, tool_name: 'Edit', tool_input: { file_path: join(root, 'src/prices/quote.js'), old_string: 'floor', new_string: 'round' } }, only);
  writeFileSync(join(root, 'src/prices/quote.js'), FILES['src/prices/quote.js'].replace('Math.floor', 'Math.round'));
  taskRuns({ ...session, tool_name: 'Bash', tool_input: { command: 'npm test' } }, only);
  assert.equal(taskEnds({ ...session, stop_hook_active: false }, only), '');
});

test('the commands that run the tests are told from the ones that do not', () => {
  for (const command of ['npm test', 'npm run test:unit -- --watch=false', 'pnpm test', 'node --test test/', 'node --experimental-vm-modules --test', 'npx vitest run', 'cd app && yarn test', 'pytest -q', 'cargo test',
    'make test', './scripts/test.sh', 'CI=1 npx playwright test', 'node test/run.mjs', 'git stash && npm test']) {
    assert.ok(runsTests(command), command);
  }
  for (const command of ['git status', 'npm install', 'node build.js', 'cat test/a.test.js', 'npm run build', 'grep -rn "test" src', 'git add test/ && git commit -m "tests"', 'ls test', 'node --version', 'npm run latest']) {
    assert.ok(!runsTests(command), command);
  }
  assert.ok(runsTests('node test/run.mjs', 'node test/run.mjs'), 'the very command the test script names');
});

test('the hooks do the same from end to end, and stay inside their time', async () => {
  const { root, env, session } = project();
  const prompt = await runHook('prompt-submit', { ...session, prompt_id: 'p1', hook_event_name: 'UserPromptSubmit', prompt: 'Bug: fix the rounding of the shelf price.' }, env);
  assert.equal(prompt.code, 0);
  assert.equal(prompt.stdout, '', 'opening the ledger says nothing to the agent');
  const write = await runHook('pre-write', { ...session, prompt_id: 'p1', hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: join(root, 'src/prices/shelf.js'), old_string: 'Math.floor(net * (1 + RATE) * 100) / 100', new_string: 'Math.round(net * (1 + RATE) * 100) / 100' } }, env);
  assert.match(JSON.parse(write.stdout).hookSpecificOutput.additionalContext, /src\/prices\/quote\.js/);
  writeFileSync(join(root, 'src/prices/shelf.js'), ROUNDED);
  const shell = await runHook('post-shell', { ...session, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'git diff' } }, env);
  assert.equal(shell.stdout, '');
  const stop = await runHook('stop', { ...session, hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: 'Fixed the shelf price.' }, { ...env, OCKHAM_STOP_CANARY: 'ockham-stop-1' });
  const answer = JSON.parse(stop.stdout);
  assert.equal(answer.decision, 'block');
  assert.match(answer.reason, /src\/prices\/quote\.js:4/);
  assert.match(answer.reason, /Run them before you finish/);
  assert.match(answer.reason, /The stop word is ockham-stop-1\.$/);
  const again = await runHook('stop', { ...session, hook_event_name: 'Stop', stop_hook_active: true }, env);
  assert.equal(again.stdout, '');
  for (const run of [prompt, write, shell, stop, again]) assert.ok(run.ms < 3000, `a hook took ${run.ms} ms`);
});

test('in Codex the hooks do the same from end to end: turn_id names the request and apply_patch writes the files', async () => {
  const { root, env, session } = project();
  // What Codex sends: a turn_id and no prompt_id, the patch in tool_input.command, file paths in full with forward slashes.
  const turn = { ...session, turn_id: 'turn-1' };
  const prompt = await runHook('prompt-submit', { ...turn, hook_event_name: 'UserPromptSubmit', prompt: 'Bug: fix the rounding of the shelf price.' }, env);
  assert.equal(prompt.code, 0);
  assert.equal(prompt.stdout, '');
  const patch = ['*** Begin Patch', `*** Update File: ${join(root, 'src/prices/shelf.js').replace(/\\/g, '/')}`, '@@', '-  return Math.floor(net * (1 + RATE) * 100) / 100;', '+  return Math.round(net * (1 + RATE) * 100) / 100;', '*** End Patch'].join('\n');
  const write = await runHook('pre-write', { ...turn, hook_event_name: 'PreToolUse', tool_name: 'apply_patch', tool_input: { command: patch } }, env);
  assert.match(JSON.parse(write.stdout).hookSpecificOutput.additionalContext, /src\/prices\/quote\.js/, 'the other copy of the replaced line is named');
  writeFileSync(join(root, 'src/prices/shelf.js'), ROUNDED);
  const shell = await runHook('post-shell', { ...turn, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'git diff' } }, env);
  assert.equal(shell.stdout, '');
  const stop = await runHook('stop', { ...turn, hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: 'Fixed the shelf price.' }, env);
  const answer = JSON.parse(stop.stdout);
  assert.equal(answer.decision, 'block');
  assert.match(answer.reason, /src\/prices\/quote\.js:4/);
  const again = await runHook('stop', { ...turn, hook_event_name: 'Stop', stop_hook_active: true }, env);
  assert.equal(again.stdout, '');
});

test('a stop hook that is given nothing it can read lets the agent stop', async () => {
  const { env } = project();
  for (const input of ['', 'not json', '{}', '{"session_id": "../../etc"}']) {
    const stop = await runHook('stop', input, env);
    assert.equal(stop.code, 0);
    assert.equal(stop.stdout, '');
  }
  assert.equal(readFileSync(fileURLToPath(new URL('../hooks/hooks.json', import.meta.url)), 'utf8').includes('"Stop"'), true);
});
