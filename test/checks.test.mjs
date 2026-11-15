import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { CHECKS, checksLost, checksMade, checksOn, claimsTests, dependencies, findings, findingsText, logicChanged } from '../src/checks.mjs';
import { refresh } from '../src/index/store.mjs';

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

const FILES = {
  'package.json': '{ "name": "shop", "type": "module", "scripts": { "test": "node --test test/" }, "dependencies": { "kept": "1.0.0" } }',
  'src/lib/text.js': '/** Turn any text into a lowercase, dash-separated identifier for URLs. */\nexport function slugify(text) {\n  return String(text).toLowerCase();\n}\n',
  'src/people/initials.js': '/** The letters shown in a circle. */\nexport function initials(name) {\n  return name[0];\n}\n',
  'src/people/card.js': "import { initials } from './initials.js';\nexport function card(member) {\n  return initials(member.name);\n}\n",
  'src/catalog/products.js': "import { slugify } from '../lib/text.js';\nexport function productUrl(product) {\n  return slugify(product.name);\n}\n",
  'src/prices/shelf.js': 'const RATE = 0.21;\n\nexport function shelfPrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
  'src/prices/quote.js': 'const RATE = 0.21;\n\nexport function quotePrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
  'src/members/list.js': 'export function page(members, at) {\n  return members.slice(at * 20, at * 20 + 20);\n}\n',
  'src/chat/sidebar.js': 'export function entry(chat) {\n  return { title: chat.name };\n}\n',
  'test/products.test.js': "import { test } from 'node:test';\ntest('a product has an address', () => {});\n",
};

/**
 * A project on disk as a task found it, the same project after `changes`, and what the checks find.
 * @param {Record<string, string>} changes  path to new text
 * @param {{ prompt?: string, env?: Record<string, string>, files?: Record<string, string>, shell?: boolean, tested?: boolean, reply?: string, told?: Set<string> }} [said]
 */
function after_(changes, { prompt = 'Do it.', env = {}, files = FILES, ...rest } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ockham-checks-test-'));
  made.push(base);
  const root = join(base, 'project');
  /** @param {string} rel @param {string} text */
  const put = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  for (const [rel, text] of Object.entries(files)) put(rel, text);
  /** @type {Map<string, string | null>} */
  const before = new Map(Object.keys(changes).map((rel) => [rel, files[rel] ?? null]));
  for (const [rel, text] of Object.entries(changes)) put(rel, text);
  const all = { OCKHAM_CACHE_DIR: join(base, 'cache'), ...env };
  const { index } = refresh(root, { env: all, budgetMs: 5000 });
  return findings(index, { root, before, deps: dependencies(files['package.json']), prompt, ...rest }, all);
}

/** @param {ReturnType<typeof findings>} found */
const names = (found) => found.map((finding) => finding.check);

test('the checks that are on: all as shipped, none when off, the ones named, and no asking for tests from who wants none', () => {
  assert.deepEqual(checksOn({}), CHECKS);
  assert.deepEqual(checksOn({ OCKHAM_CHECKS: 'off' }), []);
  assert.deepEqual(checksOn({ OCKHAM_CHECKS: 'deps, copy, nonsense' }), ['deps', 'copy']);
  assert.ok(!checksOn({ OCKHAM_TESTS: 'off' }).includes('test'));
  assert.ok(checksOn({ OCKHAM_TESTS: 'off' }).includes('guard'));
});

test('a dependency the task added is found, unless the request named it', () => {
  const added = FILES['package.json'].replace('"kept": "1.0.0"', '"kept": "1.0.0", "lodash.clonedeep": "4.5.0"');
  const found = after_({ 'package.json': added });
  assert.deepEqual(found, [{ check: 'deps', names: ['lodash.clonedeep'] }]);
  assert.deepEqual(after_({ 'package.json': added }, { prompt: 'Add lodash.clonedeep and use it.' }), []);
  assert.deepEqual(after_({ 'src/chat/sidebar.js': FILES['src/chat/sidebar.js'].replace('title', 'name') }), []);
});

test('a dependency added by a command is found too: package.json need not be among the files the task wrote', () => {
  const added = FILES['package.json'].replace('"kept": "1.0.0"', '"kept": "1.0.0", "uuid": "9.0.0"');
  const base = mkdtempSync(join(tmpdir(), 'ockham-checks-test-'));
  made.push(base);
  const root = join(base, 'project');
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'package.json'), added);
  const env = { OCKHAM_CACHE_DIR: join(base, 'cache') };
  const found = findings(refresh(root, { env }).index, { root, before: new Map(), deps: ['kept'] }, env);
  assert.deepEqual(found, [{ check: 'deps', names: ['uuid'] }]);
});

test('a second version of what another file exports is found, by its name', () => {
  const own = "export function entry(chat) {\n  return { title: chat.name, id: slugify(chat.name) };\n}\n\nfunction slugify(text) {\n  return text.toLowerCase();\n}\n";
  const found = after_({ 'src/chat/sidebar.js': own });
  assert.equal(found.length, 1);
  assert.equal(found[0].check, 'twin');
  assert.deepEqual(found[0].names, ['slugify']);
  assert.match(String(found[0].twin), /src\/lib\/text\.js/);
  // What the session was shown while it wrote, it has decided about.
  assert.deepEqual(after_({ 'src/chat/sidebar.js': own }, { told: new Set(['twin:src/chat/sidebar.js#slugify']) }), []);
});

test('a value worked out in place and named as a function the project exports is a second version too', () => {
  const own = "export function entry(chat) {\n  const initials = chat.name.split(' ').map((word) => word[0]).join('');\n  return { title: chat.name, initials };\n}\n";
  const env = { OCKHAM_CHECKS: 'twin' };
  const found = after_({ 'src/chat/sidebar.js': own }, { env });
  assert.deepEqual(names(found), ['twin']);
  assert.match(String(found[0].twin), /initials\(name\).*src\/people\/initials\.js/);
  // A name the project does not export is the file's own business.
  assert.deepEqual(after_({ 'src/chat/sidebar.js': own.replaceAll('initials', 'letters') }, { env }), []);
});

test('what a task replaced in one file and left in another is found; fixed in both, nothing is', () => {
  const round = (/** @type {string} */ text) => text.replace('Math.floor', 'Math.round');
  const found = after_({ 'src/prices/shelf.js': round(FILES['src/prices/shelf.js']) }, { env: { OCKHAM_CHECKS: 'copy' } });
  assert.equal(found.length, 1);
  assert.equal(found[0].places?.[0].file, 'src/prices/quote.js');
  assert.equal(found[0].places?.[0].line, 4);
  assert.deepEqual(after_({ 'src/prices/shelf.js': round(FILES['src/prices/shelf.js']), 'src/prices/quote.js': round(FILES['src/prices/quote.js']) }, { env: { OCKHAM_CHECKS: 'copy' } }), []);
});

const DISCOUNT = `export function applyDiscount(order, discount) {
  var pct = discount.value;
  if (pct > 100) {
    pct = 100;
  }
  if (pct < 0) {
    pct = 0;
  }
  if (typeof pct !== 'number') throw new TypeError('A discount is a number.');
  return order.total - Math.round(order.total * pct / 100);
}
`;

test('the checks a piece of source makes are counted by kind', () => {
  const made_ = checksMade(DISCOUNT);
  assert.equal(made_.get('limit:100'), 1);
  assert.equal(made_.get('limit:0'), 1);
  assert.equal(made_.get('throw'), 1);
  assert.equal(made_.get('typeof'), 1);
  assert.equal(checksMade('const pct = Math.min(100, Math.max(0, value));').get('limit:100'), 1);
  assert.equal(checksMade('const pct = clamp(value, 0, 100);').get('limit:0'), 1);
  assert.equal(checksMade("if (!isEmail(text)) return escapeHtml(text);").get('call:isEmail'), 1);
  // A stub is not a check, and a comment makes none.
  assert.equal(checksMade("throw new Error('not implemented');").size, 0);
  assert.equal(checksMade('// if (pct > 100) throw').size, 0);
});

test('a shorter version that drops a limit or a throw is found; one that keeps them in another form is not', () => {
  /** @param {string} after */
  const lost = (after) => checksLost([{ file: 'src/pricing/discount.js', before: DISCOUNT, after }]);
  const dropped = "export function applyDiscount(order, discount) {\n  return order.total - Math.round(order.total * discount.value / 100);\n}\n";
  assert.deepEqual(lost(dropped)[0].lines, ['if (pct > 100) {', 'if (pct < 0) {', "if (typeof pct !== 'number') throw new TypeError('A discount is a number.');"]);
  const kept = "export function applyDiscount(order, discount) {\n  if (typeof discount.value !== 'number') throw new TypeError('A discount is a number.');\n  const pct = Math.min(100, Math.max(0, discount.value));\n  return order.total - Math.round(order.total * pct / 100);\n}\n";
  assert.deepEqual(lost(kept), []);
  // A limit given a name, in a comparison or in what holds a value to it.
  const named = "const MOST = 100;\n\nexport function applyDiscount(order, discount) {\n  if (typeof discount.value !== 'number') throw new TypeError('A discount is a number.');\n  const pct = Math.min(Math.max(discount.value, 0), MOST);\n  return order.total - Math.round(order.total * pct / 100);\n}\n";
  assert.deepEqual(lost(named), []);
  const helper = "const clamp = (value, low, high) => Math.min(Math.max(value, low), high);\n\nexport function applyDiscount(order, discount) {\n  if (typeof discount.value !== 'number') throw new TypeError('A discount is a number.');\n  return order.total - Math.round(order.total * clamp(discount.value, 0, 100) / 100);\n}\n";
  assert.deepEqual(lost(helper), []);
  // Only the throw gone: fewer throws is a check lost, even with the limits in place.
  assert.equal(lost(kept.replace(/^.*throw.*\n/m, '')).length, 1);
});

test('a limit given a name, an order worked out another way and a function taken out are not checks lost', () => {
  const upload = 'export function tooBig(file) {\n  return file.size > 5 * 1024 * 1024;\n}\n';
  assert.deepEqual(checksLost([{ file: 'a.js', before: upload, after: 'const MAX = 20 * 1024 * 1024;\nexport function tooBig(file) {\n  return file.size > MAX;\n}\n' }]), []);
  const sort = 'export function sorted(list) {\n  return [...list].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));\n}\n';
  assert.deepEqual(checksLost([{ file: 'a.js', before: sort, after: 'export function sorted(list) {\n  return [...list].sort((a, b) => a.name.localeCompare(b.name));\n}\n' }]), []);
  assert.deepEqual(checksLost([{ file: 'a.js', before: `${DISCOUNT}\nexport function other() {}\n`, after: 'export function other() {}\n' }]), []);
});

test('a check that moved into a file the task made is still made', () => {
  const before = 'export function canRedeem(customer, reward) {\n  if (customer.points < 0) throw new RangeError("points");\n  return customer.points >= reward.cost;\n}\n';
  const after = "import { checkPoints } from './points.js';\nexport function canRedeem(customer, reward) {\n  checkPoints(customer.points);\n  return customer.points >= reward.cost;\n}\n";
  const moved = 'export function checkPoints(points) {\n  if (points < 0) throw new RangeError("points");\n}\n';
  assert.deepEqual(checksLost([{ file: 'a.js', before, after }, { file: 'points.js', before: null, after: moved }]), []);
  assert.equal(checksLost([{ file: 'a.js', before, after }]).length, 1);
});

test('new values in the same code are not new logic, and neither is a comment', () => {
  assert.equal(logicChanged(FILES['src/members/list.js'], FILES['src/members/list.js'].replaceAll('20', '50')), false);
  assert.equal(logicChanged(FILES['src/members/list.js'], `// Fifty a page.\n${FILES['src/members/list.js']}`), false);
  assert.equal(logicChanged(FILES['src/members/list.js'], FILES['src/members/list.js'].replace('at * 20 + 20', 'Math.min(members.length, at * 20 + 20)')), true);
  assert.equal(logicChanged(null, 'export const a = 1;\n'), true);
});

test('a fix with no test touched is asked for one; a new value, a wrapped call or a project without tests is not', () => {
  const env = { OCKHAM_CHECKS: 'test' };
  const fixed = FILES['src/prices/shelf.js'].replace('Math.floor', 'Math.round');
  assert.deepEqual(after_({ 'src/prices/shelf.js': fixed }, { env, prompt: 'Bug: 19.99 shows as 24.18. Fix the rounding.' }), [{ check: 'test', file: 'src/prices/shelf.js', why: 'fix' }]);
  // The same change with a test beside it.
  assert.deepEqual(after_({ 'src/prices/shelf.js': fixed, 'test/shelf.test.js': "import { test } from 'node:test';\ntest('rounds', () => {});\n" }, { env, prompt: 'Bug: fix the rounding.' }), []);
  // A new value is not logic, unless the request says the old one was a bug: then the value is the fix.
  const fifty = { 'src/members/list.js': FILES['src/members/list.js'].replaceAll('20', '50') };
  assert.deepEqual(after_(fifty, { env, prompt: 'Show 50 members per page instead of 20.' }), []);
  assert.deepEqual(names(after_(fifty, { env, prompt: 'Bug: the page should hold 50 members. Fix it.' })), ['test']);
  // A project that has no tests is not given its first one here.
  const { 'test/products.test.js': _, ...untested } = FILES;
  assert.deepEqual(after_({ 'src/prices/shelf.js': fixed }, { env, prompt: 'Bug: fix the rounding.', files: untested }), []);
  // Nobody who asked for no tests is asked for one.
  assert.deepEqual(after_({ 'src/prices/shelf.js': fixed }, { env: { OCKHAM_TESTS: 'off' }, prompt: 'Bug: fix the rounding.' }).filter((finding) => finding.check === 'test'), []);
});

test('what a change touches says whether it is risky: money, parsing, validation, security', () => {
  const env = { OCKHAM_CHECKS: 'test' };
  /** @param {string} line */
  const why = (line) => after_({ 'src/chat/sidebar.js': `export function entry(chat) {\n  ${line}\n  return { title: chat.name };\n}\n` }, { env })[0]?.why;
  assert.equal(why('const total = chat.items.reduce((sum, item) => sum + item.cents, 0);'), 'money');
  assert.equal(why("const [key, text] = chat.line.split('=');"), 'parsing');
  assert.equal(why("if (!chat.name) throw new Error('A chat has a name.');"), 'validation');
  assert.equal(why('const safe = escapeHtml(chat.name);'), 'security');
  assert.equal(why('const count = chat.messages.length;'), undefined);
  // A call that is only wrapped brings in the wrapper, not what the call already did.
  const rates = "export function rates(postcode, get) {\n  return get(`https://carrier.example/rates?postcode=${encodeURIComponent(postcode)}`);\n}\n";
  const wrapped = rates.replace('return get(', 'return withRetry(() => get(').replace(');\n}', '));\n}');
  assert.deepEqual(after_({ 'src/shipping/rates.js': wrapped }, { env, files: { ...FILES, 'src/shipping/rates.js': rates } }), []);
  // A function written in the place of a stub is about what its name says.
  const stub = "export function parseSuppliers(text) {\n  throw new Error('not implemented');\n}\n";
  const written = "export function parseSuppliers(text) {\n  return rows(text).map(([name, city]) => ({ name, city }));\n}\n";
  assert.equal(after_({ 'src/suppliers/import.js': written }, { env, files: { ...FILES, 'src/suppliers/import.js': stub } })[0]?.why, 'parsing');
});

test('a summary that says the tests pass is told from one that says they might', () => {
  assert.ok(claimsTests('Fixed the rounding. Both tests pass, including the new one.'));
  assert.ok(claimsTests('The existing even-split test still passes.'));
  assert.ok(claimsTests('He cambiado el redondeo. Las pruebas pasan.'));
  assert.ok(!claimsTests('I could not run the tests, so I cannot say that they pass.'));
  assert.ok(!claimsTests('The tests should pass once the fixture is updated.'));
  assert.ok(!claimsTests('Added a test for the comma case.'));
});

test('tests not run are asked for only where there is a shell, and a claim only where none ran', () => {
  const change = { 'src/chat/sidebar.js': FILES['src/chat/sidebar.js'].replace('title: chat.name', 'title: chat.name.trim()') };
  const env = { OCKHAM_CHECKS: 'run,claim' };
  assert.deepEqual(names(after_(change, { env, shell: true })), ['run']);
  assert.deepEqual(names(after_(change, { env, shell: true, tested: true })), []);
  assert.deepEqual(names(after_(change, { env })), []);
  assert.deepEqual(names(after_(change, { env, reply: 'Done. All tests pass.' })), ['claim']);
  assert.deepEqual(names(after_(change, { env, reply: 'Done. All tests pass.', tested: true })), []);
  // Told to run them, the agent is not also told that it said they pass.
  assert.deepEqual(names(after_(change, { env, shell: true, reply: 'Done. All tests pass.' })), ['run']);
  // A comment and nothing else gives the tests nothing to say.
  assert.deepEqual(names(after_({ 'src/chat/sidebar.js': `// One entry of the chat list.\n${FILES['src/chat/sidebar.js']}` }, { env, shell: true, reply: 'All tests pass.' })), []);
  // Nothing was written: nothing to run them for.
  assert.deepEqual(names(after_({}, { env, shell: true, reply: 'All tests pass.' })), []);
});

test('what is said has one line for each thing found, in both languages, and nothing when nothing was found', () => {
  assert.equal(findingsText([]), '');
  const found = [
    { check: 'deps', names: ['uuid'] },
    { check: 'twin', file: 'src/a.js', names: ['slugify'], twin: '`slugify` in src/lib/text.js:2' },
    { check: 'copy', places: [{ file: 'src/b.js', line: 4, text: 'return Math.floor(x);' }, { file: 'src/c.js', line: 9, text: 'return Math.floor(y);' }] },
    { check: 'guard', file: 'src/d.js', lines: ['if (pct > 100) {'] },
    { check: 'test', file: 'src/e.js', why: 'money' },
    { check: 'run' },
    { check: 'claim' },
  ];
  for (const language of ['en', 'es']) {
    const lines = findingsText(found, language).split('\n');
    assert.match(lines[0], /^Ockham: /);
    assert.equal(lines.filter((line) => line.startsWith('- ')).length, 8, language);
    assert.equal(lines.length, 10, language);
    assert.ok(lines.every((line) => !/undefined|\[object/.test(line)), language);
  }
  assert.match(findingsText(found, 'es'), /dependencia nueva/);
  assert.match(findingsText(found, 'en'), /src\/b\.js:4/);
});
