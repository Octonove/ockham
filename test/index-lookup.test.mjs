import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { definitionsIn, digest, hintsFor, testFacts, twinsOf } from '../src/index/lookup.mjs';
import { digestText, hintText, testsText, twinText } from '../src/index/say.mjs';
import { isTest, sourceFiles } from '../src/index/scan.mjs';
import { cacheDir, indexPath, loadIndex, refresh } from '../src/index/store.mjs';

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

/**
 * A project on disk, and an environment that keeps its index next to it.
 * @param {Record<string, string>} files
 */
function project(files) {
  const base = mkdtempSync(join(tmpdir(), 'ockham-index-test-'));
  made.push(base);
  const root = join(base, 'project');
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return { root, env: { OCKHAM_CACHE_DIR: join(base, 'cache') } };
}

const SHOP = {
  'src/lib/text.js': '/** Turn any text into a lowercase, dash-separated identifier for URLs. */\nexport function slugify(text) {}\n\n/** Cut text to at most `max` characters. */\nexport function truncate(text, max) {}\n',
  'src/validation/email.js': '/** Is this something we can send mail to? */\nexport function isEmail(text) {}\n',
  'src/catalog/products.js': "import { slugify } from '../lib/text.js';\n\n/** The address of a product page. */\nexport function productUrl(product) { return slugify(product.name); }\n",
  'src/account/register.js': "import { isEmail } from '../validation/email.js';\nimport { slugify } from '../lib/text.js';\n\nexport function register(form) {}\n",
  'src/checkout/total.js': 'const VAT = 0.21;\n\n/** What the customer pays at checkout: the net prices plus VAT. */\nexport function checkoutTotal(items) {}\n',
  'src/invoice/amounts.js': 'const VAT = 0.21;\n\n/** The amounts printed at the foot of an invoice. */\nexport function invoiceAmounts(items) {}\n',
  'src/util/timing.js': '/** Call `fn` once, `ms` after the last call in a burst. */\nexport function debounce(fn, ms) {}\n',
  'test/checkout.test.js': "import { test } from 'node:test';\nimport { checkoutTotal } from '../src/checkout/total.js';\n\nexport function helperOnlyForTests() {}\n",
  'node_modules/lodash/index.js': 'export function debounce() {}\n',
  '.cache/build.js': 'export function slugify() {}\n',
  'dist/bundle.js': 'export function slugify() {}\n',
  'src/types.d.ts': 'export function declared(): void;\n',
  'README.md': '# shop\n',
};

test('only what was written by hand is listed: no packages, no build output, no hidden folders', () => {
  const { root } = project(SHOP);
  const { files, truncated } = sourceFiles(root);
  assert.equal(truncated, false);
  assert.deepEqual(files, ['src/account/register.js', 'src/catalog/products.js', 'src/checkout/total.js', 'src/invoice/amounts.js',
    'src/lib/text.js', 'src/util/timing.js', 'src/validation/email.js', 'test/checkout.test.js']);
  assert.equal(sourceFiles(root, { maxFiles: 3 }).truncated, true);
});

test('test files are told from the rest', () => {
  for (const file of ['test/a.js', 'tests/unit/a.js', 'src/__tests__/a.js', 'src/a.test.js', 'src/a.spec.ts', 'e2e/login.js']) assert.equal(isTest(file), true, file);
  for (const file of ['src/a.js', 'src/contest/a.js', 'src/latest.js', 'src/testing-library.js']) assert.equal(isTest(file), false, file);
});

test('the index is kept outside the project, where OCKHAM_CACHE_DIR says', () => {
  const { root, env } = project(SHOP);
  assert.equal(cacheDir(env), env.OCKHAM_CACHE_DIR);
  assert.ok(indexPath(root, env).startsWith(env.OCKHAM_CACHE_DIR));
  assert.equal(loadIndex(root, env), null);
  refresh(root, { env });
  assert.equal(existsSync(indexPath(root, env)), true);
  assert.equal(existsSync(join(root, '.ockham')), false);
  assert.equal(sourceFiles(root).files.length, 8, 'nothing was written into the project');
});

test('a second look reads nothing again; a changed file is read again; a deleted one is forgotten', () => {
  const { root, env } = project(SHOP);
  const first = refresh(root, { env });
  assert.equal(first.changed, 8);
  assert.equal(first.index.complete, true);
  assert.equal(refresh(root, { env }).changed, 0);

  const file = join(root, 'src/lib/text.js');
  writeFileSync(file, 'export function slugify(text) {}\nexport function titleCase(text) {}\n');
  utimesSync(file, new Date(), new Date(Date.now() + 5000));
  const second = refresh(root, { env });
  assert.equal(second.changed, 1);
  assert.deepEqual(second.index.files['src/lib/text.js'].symbols.map((symbol) => symbol.name), ['slugify', 'titleCase']);

  rmSync(join(root, 'src/util/timing.js'));
  const third = refresh(root, { env });
  assert.equal(third.changed, 1);
  assert.equal(third.index.files['src/util/timing.js'], undefined);
});

test('imports are followed to the files of the project, and packages are kept by name', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  assert.deepEqual(index.files['src/account/register.js'].imports.sort(), ['src/lib/text.js', 'src/validation/email.js']);
  assert.deepEqual(index.files['test/checkout.test.js'].uses, ['node:test']);
  assert.equal(index.files['test/checkout.test.js'].test, true);
});

test('a first build that runs out of time says so and goes on the next time', () => {
  /** @type {Record<string, string>} */
  const many = {};
  for (let n = 0; n < 60; n++) many[`src/m${String(n).padStart(2, '0')}.js`] = `export function f${n}() {}\n`;
  const { root, env } = project(many);
  const first = refresh(root, { env, budgetMs: -1 });
  assert.equal(first.index.complete, false);
  assert.equal(Object.keys(first.index.files).length, 0);
  const second = refresh(root, { env, budgetMs: 10_000 });
  assert.equal(second.index.complete, true);
  assert.equal(Object.keys(second.index.files).length, 60);
});

test('an index that cannot be read is built again', () => {
  const { root, env } = project(SHOP);
  refresh(root, { env });
  writeFileSync(indexPath(root, env), '{ not json');
  assert.equal(loadIndex(root, env), null);
  assert.equal(refresh(root, { env }).changed, 8);
});

test('what a session is told at the start: the helpers other files import, most shared first, and nothing from tests', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  const shared = digest(index);
  assert.deepEqual(shared.map((found) => found.name), ['slugify', 'truncate', 'isEmail', 'debounce']);
  assert.ok(!shared.some((found) => found.name === 'helperOnlyForTests' || found.name === 'checkoutTotal'));
  assert.equal(digest(index, { limit: 2 }).length, 2);
  const text = digestText(index);
  assert.match(text, /^Ockham: what this project already has/);
  assert.match(text, /- slugify\(text\) in src\/lib\/text\.js - Turn any text into a lowercase, dash-separated identifier for URLs\./);
  assert.match(digestText(index, 'es'), /^Ockham: lo que este proyecto ya tiene/);
});

test('a request brings up what is named after its words and shares one more', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  const hints = hintsFor(index, 'Bug: an order shows 24.18 at checkout. With 21% VAT it should be 24.19. Fix the rounding.');
  assert.deepEqual(hints.map((found) => `${found.file}#${found.name}`).sort(), ['src/checkout/total.js#VAT', 'src/checkout/total.js#checkoutTotal', 'src/invoice/amounts.js#VAT']);
  assert.match(hintText(hints), /^Ockham: for this request, the project already has:\n- /);
  assert.match(hintText(hints), /VAT = 0\.21 in src\/(checkout\/total|invoice\/amounts)\.js:1/);
});

test('a request with one common word in common brings up nothing', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  assert.deepEqual(hintsFor(index, 'Write the text of the welcome page.'), []);
  assert.deepEqual(hintsFor(index, 'ok, thanks'), []);
  assert.deepEqual(hintsFor(index, ''), []);
});

test('what a request spells out is not brought up again, and tests never are', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  const named = hintsFor(index, 'Make checkoutTotal in src/checkout/total.js round the VAT of the invoice up: 21 percent.');
  assert.ok(!named.some((found) => found.file === 'src/checkout/total.js'), 'the file the request names');
  assert.ok(named.some((found) => found.file === 'src/invoice/amounts.js'));
  assert.ok(!hintsFor(index, 'helper only for tests of the checkout').some((found) => found.file.startsWith('test/')));
});

test('a new definition has a twin when another file exports that name, or a function about the same', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  const twin = (/** @type {string} */ source, file = 'src/newsletter/subscribe.js') => twinsOf(index, file, definitionsIn(source)).map((found) => `${found.name}~${found.twin.file}#${found.twin.name}`);
  assert.deepEqual(twin('function slugify(text) {}'), ['slugify~src/lib/text.js#slugify']);
  assert.deepEqual(twin('const isValidEmail = (text) => true;'), ['isValidEmail~src/validation/email.js#isEmail']);
  assert.deepEqual(twin('export function toSlug(name) {}'), ['toSlug~src/lib/text.js#slugify']);
  assert.deepEqual(twin('function subscribe(list, email) {}'), []);
  assert.deepEqual(twin('function slugify(text) {}', 'src/lib/text.js'), [], 'its own file is not a twin');
});

test('constants are twins only by their exact name, and what is not exported has no say', () => {
  const { root, env } = project({ ...SHOP, 'src/settings/defaults.js': 'export const defaults = { page: 20 };\nexport const PAGE_SIZE = 20;\n' });
  const { index } = refresh(root, { env });
  const twin = (/** @type {string} */ source) => twinsOf(index, 'src/new.js', definitionsIn(source)).map((found) => found.twin.name);
  assert.deepEqual(twin('const DEFAULTS = { quiet: false };'), []);
  assert.deepEqual(twin('const PAGE_SIZE = 50;'), ['PAGE_SIZE']);
  assert.deepEqual(twin('const VAT = 0.21;'), [], 'VAT is private to the two files that have it');
  assert.match(twinText('slugify', 'src/new.js', { name: 'slugify', kind: 'function', line: 2, exported: true, params: 'text', doc: 'Turn it.', file: 'src/lib/text.js' }),
    /this change defines `slugify` in src\/new\.js, and the project already has slugify\(text\) in src\/lib\/text\.js:2\. /);
});

test('where the tests are, and what they are written with', () => {
  const { root, env } = project(SHOP);
  const { index } = refresh(root, { env });
  assert.deepEqual(testFacts(index), { count: 1, folder: 'test', beside: false, sample: 'test/checkout.test.js', runner: 'node:test' });
  assert.equal(testsText(index, { script: 'node --test test/' }),
    "Ockham: this project's tests are in test/ (1 of them), written with node:test; `npm test` runs `node --test test/`. A new test goes with them, in their style.");
  assert.equal(testsText(index, { head: (file) => `first lines of ${file}` }),
    "Ockham: this project's tests are in test/ (1 of them), written with node:test. A new test goes with them, in their style. So that you do not have to open one to see that style, this is how test/checkout.test.js begins:\nfirst lines of test/checkout.test.js");
  assert.match(testsText(index, { language: 'es' }), /^Ockham: las pruebas de este proyecto están en test\/ \(1\), escritas con node:test\. /);

  const beside = project({ 'src/a/a.js': '', 'src/a/a.test.js': "import { it } from 'vitest';", 'src/b/b.test.js': "import { it } from 'vitest';", 'src/c/c.test.js': "import { it } from 'vitest';" });
  assert.equal(testFacts(refresh(beside.root, { env: beside.env }).index)?.beside, true);
  assert.equal(testFacts(refresh(beside.root, { env: beside.env }).index)?.runner, 'Vitest');

  const none = project({ 'src/a.js': 'export function a() {}' });
  assert.equal(testFacts(refresh(none.root, { env: none.env }).index), null);
  assert.equal(testsText(refresh(none.root, { env: none.env }).index), '');
});
