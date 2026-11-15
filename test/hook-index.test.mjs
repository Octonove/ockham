import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, parse } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readJson } from '../src/hookio.mjs';
import { readJournal } from '../src/journal.mjs';
import { projectRoot, requestContext, sharedContext, writeContext } from '../src/project.mjs';
import { rules } from '../src/session.mjs';

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

const FILES = {
  'package.json': '{ "name": "shop", "type": "module", "scripts": { "test": "node --test test/" } }',
  'src/lib/text.js': '/** Turn any text into a lowercase, dash-separated identifier for URLs. */\nexport function slugify(text) {}\n',
  'src/validation/email.js': '/** Is this something we can send mail to? */\nexport function isEmail(text) {}\n',
  'src/catalog/products.js': "import { slugify } from '../lib/text.js';\nexport function productUrl(product) { return slugify(product.name); }\n",
  'src/account/register.js': "import { isEmail } from '../validation/email.js';\nexport function register(form) {}\n",
  'test/products.test.js': "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\n\nimport { productUrl } from '../src/catalog/products.js';\n\ntest('a product has an address', () => {\n  assert.equal(typeof productUrl({ name: 'Pen' }), 'string');\n});\n\ntest('a second test that is not shown', () => {});\n",
};

/** A project on disk, and an environment that keeps everything Ockham writes next to it. */
function project() {
  const base = mkdtempSync(join(tmpdir(), 'ockham-hook-test-'));
  made.push(base);
  const root = join(base, 'project');
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return { root, env: { OCKHAM_CACHE_DIR: join(base, 'cache') } };
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

test('a hook input is read as soon as it is whole, without waiting for stdin to close', async () => {
  const { PassThrough } = await import('node:stream');
  const stdin = new PassThrough();
  const started = Date.now();
  const reading = readJson(5000, stdin);
  stdin.write('{"prompt": "hel');
  stdin.write('lo", "nested": {"a": 1}}');
  assert.deepEqual(await reading, { prompt: 'hello', nested: { a: 1 } });
  assert.ok(Date.now() - started < 1000);
  const garbage = new PassThrough();
  const never = readJson(50, garbage);
  garbage.write('not json at all');
  assert.deepEqual(await never, {});
});

test('the folder of a project is what the host says, and never the home folder or the top of a disk', () => {
  assert.equal(projectRoot({ cwd: join(tmpdir(), 'somewhere') }, {}), join(tmpdir(), 'somewhere'));
  assert.equal(projectRoot({}, { CLAUDE_PROJECT_DIR: join(tmpdir(), 'elsewhere') }), join(tmpdir(), 'elsewhere'));
  assert.equal(projectRoot({ cwd: homedir() }, {}), null);
  assert.equal(projectRoot({ cwd: parse(tmpdir()).root }, {}), null);
});

test('at the start a session is told the helpers the project shares, and where its tests are when that is on', () => {
  const { root, env } = project();
  const shared = sharedContext({ cwd: root, session_id: 's1' }, { ...env, OCKHAM_FACTS: 'off' });
  assert.match(shared, /^Ockham: what this project already has/);
  assert.match(shared, /- slugify\(text\) in src\/lib\/text\.js/);
  assert.match(shared, /- isEmail\(text\) in src\/validation\/email\.js/);
  assert.doesNotMatch(shared, /tests are in/);
  assert.doesNotMatch(sharedContext({ cwd: root, session_id: 's1' }, { ...env, OCKHAM_TESTS: 'off' }), /tests are in/, 'no tests wanted, no tests shown');
  const withTests = sharedContext({ cwd: root, session_id: 's1' }, env);
  assert.match(withTests, /this project's tests are in test\/ \(1 of them\), written with node:test; `npm test` runs `node --test test\/`\./);
  assert.match(withTests, /this is how test\/products\.test\.js begins:\nimport assert from 'node:assert\/strict';\nimport \{ test \} from 'node:test';\n[\s\S]*test\('a product has an address', \(\) => \{\n[^\n]+\n\}\);$/);
  assert.doesNotMatch(withTests, /a second test that is not shown/);
  assert.match(sharedContext({ cwd: root }, { ...env, OCKHAM_LANG: 'es', OCKHAM_FACTS: 'on' }), /^Ockham: lo que este proyecto ya tiene[\s\S]*las pruebas de este proyecto están en test\//);
});

test('OCKHAM_INDEX=off says nothing at any of the three moments', () => {
  const { root, env } = project();
  const off = { ...env, OCKHAM_INDEX: 'off', OCKHAM_HINTS: 'on', OCKHAM_FACTS: 'on' };
  assert.equal(sharedContext({ cwd: root }, off), '');
  assert.equal(requestContext({ cwd: root, prompt: 'slugify the text of the identifier for the URLs' }, off), '');
  assert.equal(writeContext({ cwd: root, tool_name: 'Write', tool_input: { file_path: join(root, 'src/new.js'), content: 'function slugify(text) {}' } }, off), '');
});

test('a request brings something up only when that is on, and never the same thing twice in a session', () => {
  const { root, env } = project();
  const prompt = 'The identifier of a category must be made with slugify-like text for the URLs.';
  assert.equal(requestContext({ cwd: root, session_id: 's1', prompt }, env), '');
  const on = { ...env, OCKHAM_HINTS: 'on' };
  const first = requestContext({ cwd: root, session_id: 's1', prompt }, on);
  assert.match(first, /^Ockham: for this request, the project already has:\n- slugify\(text\) in src\/lib\/text\.js:2/);
  assert.equal(requestContext({ cwd: root, session_id: 's1', prompt }, on), '');
  assert.equal(requestContext({ cwd: root, session_id: 's2', prompt }, on), first);
  assert.equal(requestContext({ cwd: root, session_id: 's3', prompt: '' }, on), '');
});

test('writing a second copy of what the project exports is pointed out, once a session', () => {
  const { root, env } = project();
  const write = (/** @type {string} */ session, /** @type {string} */ rel, /** @type {string} */ content) => writeContext({ cwd: root, session_id: session, tool_name: 'Write', tool_input: { file_path: join(root, rel), content } }, env);
  assert.equal(write('s1', 'src/newsletter/subscribe.js', 'export function subscribe(list, email) {}'), '');
  const told = write('s1', 'src/newsletter/subscribe.js', 'const isValidEmail = (text) => /@/.test(text);\nexport function subscribe(list, email) {}');
  assert.equal(told, 'Ockham: this change defines `isValidEmail` in src/newsletter/subscribe.js, and the project already has isEmail(text) in src/validation/email.js:2. If it does the same job, import that one and take the new one out.');
  assert.equal(write('s1', 'src/categories.js', 'function slugify(text) {}'), '', 'one a session');
  assert.match(write('s2', 'src/categories.js', 'function slugify(text) {}'), /defines `slugify` in src\/categories\.js/);
  assert.match(writeContext({ cwd: root, session_id: 's3', tool_name: 'Write', tool_input: { file_path: 'src/relative.js', content: 'function slugify(text) {}' } }, env), /in src\/relative\.js/);
});

test('an edit is judged by what it adds, not by what it moves', () => {
  const { root, env } = project();
  const edit = (/** @type {string} */ session, /** @type {string} */ before, /** @type {string} */ after_) => writeContext({ cwd: root, session_id: session, tool_name: 'Edit', tool_input: { file_path: join(root, 'src/account/register.js'), old_string: before, new_string: after_ } }, env);
  assert.match(edit('s1', 'export function register(form) {}', 'function slugify(text) {}\nexport function register(form) {}'), /defines `slugify`/);
  assert.equal(edit('s2', 'function slugify(text) { return 1; }', 'function slugify(text) { return 2; }'), '');
  assert.equal(edit('s3', '  const a = 1;', '  const slugify = (text) => text;'), '', 'what is indented is inside something');
  const multi = writeContext({ cwd: root, session_id: 's4', tool_name: 'MultiEdit', tool_input: { file_path: join(root, 'src/account/register.js'), edits: [{ old_string: 'a', new_string: 'b' }, { old_string: '', new_string: 'function isEmail(text) {}' }] } }, env);
  assert.match(multi, /defines `isEmail`/);
});

test('tests, files that are not source and files outside the project are left alone', () => {
  const { root, env } = project();
  const write = (/** @type {string} */ file) => writeContext({ cwd: root, session_id: 's1', tool_name: 'Write', tool_input: { file_path: file, content: 'function slugify(text) {}' } }, env);
  assert.equal(write(join(root, 'test/text.test.js')), '');
  assert.equal(write(join(root, 'notes.md')), '');
  assert.equal(write(join(root, '..', 'elsewhere.js')), '');
  assert.equal(writeContext({ cwd: root, tool_name: 'Read', tool_input: { file_path: join(root, 'src/x.js') } }, env), '');
  assert.equal(writeContext({ cwd: root, tool_name: 'Write', tool_input: {} }, env), '');
});

test('what was said is written down with the project it was said in', () => {
  const { root, env } = project();
  sharedContext({ cwd: root, session_id: 's1' }, env);
  requestContext({ cwd: root, session_id: 's1', prompt: 'slugify the text of the identifier for the URLs' }, { ...env, OCKHAM_HINTS: 'on' });
  writeContext({ cwd: root, session_id: 's1', tool_name: 'Write', tool_input: { file_path: join(root, 'src/new.js'), content: 'function slugify(text) {}' } }, env);
  const events = readJournal(env);
  assert.deepEqual(events.map((event) => event.event), ['shared', 'hint', 'twin']);
  assert.ok(events.every((event) => event.root === root && event.session === 's1' && typeof event.at === 'string'));
  assert.deepEqual(events[1].symbols, ['src/lib/text.js#slugify']);
  assert.equal(events[2].twin, 'src/lib/text.js#slugify');
});

test('the session hook hands out the rules and then what the project has', async () => {
  const { root, env } = project();
  const result = await runHook('session-start', '', { ...env, CLAUDE_PROJECT_DIR: root, OCKHAM_RULES: '', OCKHAM_LANG: '', OCKHAM_INDEX: '', OCKHAM_FACTS: '', OCKHAM_CANARY: '' });
  assert.equal(result.code, 0);
  const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  assert.ok(context.startsWith(rules('en')));
  assert.match(context, /\n\nOckham: what this project already has[\s\S]*- slugify\(text\) in src\/lib\/text\.js/);
  const rulesOnly = await runHook('session-start', '', { ...env, CLAUDE_PROJECT_DIR: root, OCKHAM_RULES: '', OCKHAM_LANG: '', OCKHAM_INDEX: 'off', OCKHAM_CANARY: '' });
  assert.equal(JSON.parse(rulesOnly.stdout).hookSpecificOutput.additionalContext, rules('en'));
});

test('the request hook and the write hook answer in the form the host expects, and fast', async () => {
  const { root, env } = project();
  const asked = await runHook('prompt-submit', { hook_event_name: 'UserPromptSubmit', cwd: root, session_id: 's1', prompt: 'slugify the text of the identifier for the URLs' }, { ...env, OCKHAM_HINTS: 'on', OCKHAM_INDEX: '' });
  assert.equal(asked.code, 0);
  assert.equal(JSON.parse(asked.stdout).hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(JSON.parse(asked.stdout).hookSpecificOutput.additionalContext, /slugify\(text\) in src\/lib\/text\.js:2/);
  assert.ok(asked.ms < 5000, `took ${asked.ms} ms`);

  const written = await runHook('pre-write', { hook_event_name: 'PreToolUse', cwd: root, session_id: 's1', tool_name: 'Write', tool_input: { file_path: join(root, 'src/new.js'), content: 'function slugify(text) {}' } }, { ...env, OCKHAM_INDEX: '' });
  assert.equal(written.code, 0);
  assert.deepEqual(Object.keys(JSON.parse(written.stdout).hookSpecificOutput), ['hookEventName', 'additionalContext'], 'it adds a note and decides nothing about the permission');
  assert.equal(JSON.parse(written.stdout).hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.ok(written.ms < 5000, `took ${written.ms} ms`);
});

test('a hook that is given nonsense, or nothing to say, prints nothing and exits 0', async () => {
  const { root, env } = project();
  for (const [name, input] of /** @type {[string, any][]} */ ([
    ['prompt-submit', 'this is not json'],
    ['prompt-submit', { cwd: root, prompt: 'ok' }],
    ['pre-write', '{"tool_name": "Write", "tool_input": '],
    ['pre-write', { cwd: root, tool_name: 'Write', tool_input: { file_path: join(root, 'src/fine.js'), content: 'export function brandNew() {}' } }],
  ])) {
    const result = await runHook(name, input, { ...env, OCKHAM_HINTS: 'on', OCKHAM_INDEX: '' });
    assert.equal(result.code, 0, name);
    assert.equal(result.stdout, '', name);
  }
});
