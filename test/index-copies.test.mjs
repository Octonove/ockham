import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { copiesOf, inCommon, linesTakenAway, namesIn, tokens } from '../src/index/copies.mjs';
import { copiesText } from '../src/index/say.mjs';
import { refresh } from '../src/index/store.mjs';
import { readJournal } from '../src/journal.mjs';
import { writeContext } from '../src/project.mjs';

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

/** @param {Record<string, string>} files */
function project(files) {
  const base = mkdtempSync(join(tmpdir(), 'ockham-copies-test-'));
  made.push(base);
  const root = join(base, 'project');
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  const env = { OCKHAM_CACHE_DIR: join(base, 'cache') };
  return { root, env, index: refresh(root, { env }).index };
}

const SHOP = {
  'src/checkout/total.js': 'const VAT = 0.21;\n\nexport function checkoutTotal(items) {\n  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  return Math.floor(net * (1 + VAT) * 100) / 100;\n}\n',
  'src/invoice/amounts.js': 'const VAT = 0.21;\n\nexport function invoiceAmounts(items) {\n  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  const total = Math.floor(net * (1 + VAT) * 100) / 100;\n  return { net, total };\n}\n',
  'src/loyalty/redeem.js': "export const REWARDS = [{ name: 'Free delivery', cost: 100 }];\n\nexport function redeemable(points) {\n  return REWARDS.filter((reward) => points > reward.cost);\n}\n",
  'src/emails/points.js': "import { REWARDS } from '../loyalty/redeem.js';\n\nexport function pointsEmail(customer) {\n  const within = REWARDS.filter((reward) => customer.points > reward.cost).map((reward) => reward.name);\n  return { to: customer.email, body: within.join(', ') };\n}\n",
  'src/orders/list.js': 'export function orderList(orders) {\n  for (const order of orders) {\n    if (!order.id) return null;\n  }\n  return orders.map((order) => order.id);\n}\n',
  'src/users/list.js': 'export function userList(users) {\n  for (const user of users) {\n    if (!user.id) return null;\n  }\n  return users.map((user) => user.id);\n}\n',
  'test/checkout.test.js': "import { checkoutTotal } from '../src/checkout/total.js';\n// return Math.floor(net * (1 + VAT) * 100) / 100;\nconst total = Math.floor(net * (1 + VAT) * 100) / 100;\n",
};

test('a line is read as its tokens, with the operators whole', () => {
  assert.deepEqual(tokens('  return points >= reward.cost;'), ['return', 'points', '>=', 'reward', '.', 'cost', ';']);
  assert.deepEqual(tokens("const f = (a) => a === 'x y' ? 1.5 : [...b];"), ['const', 'f', '=', '(', 'a', ')', '=>', 'a', '===', "'x y'", '?', '1.5', ':', '[', '...', 'b', ']', ';']);
  assert.deepEqual(tokens(''), []);
});

test('the names a file uses leave out the words of the language', () => {
  assert.deepEqual(namesIn('const total = Math.floor(net * (1 + VAT) * 100) / 100;\nreturn items.map((it) => it.id);').sort(), ['VAT', 'floor', 'items', 'net', 'total']);
});

test('the lines a change takes away are the ones its new text no longer has', () => {
  const before = 'function f() {\n  // old\n  return Math.floor(x);\n}';
  assert.deepEqual(linesTakenAway(before, 'function f() {\n  return Math.round(x);\n}'), ['  return Math.floor(x);']);
  assert.deepEqual(linesTakenAway(before, before), []);
  assert.deepEqual(linesTakenAway('  return   Math.floor( x );', 'return Math.floor(x);'), [], 'spacing is not a change');
  assert.deepEqual(linesTakenAway("import { a } from './a.js';\n", ''), [], 'an import is not logic');
});

test('what two lines have in the same order is found across what differs between them', () => {
  assert.deepEqual(inCommon(tokens('points > reward.cost'), tokens('customer.points > reward.cost')), ['points', '>', 'reward', '.', 'cost']);
  assert.deepEqual(inCommon(tokens('a + b'), tokens('c * d')), []);
  assert.deepEqual(inCommon([], tokens('a')), []);
});

test('a fix to a copied formula is told where the other copy is', () => {
  const { root, index } = project(SHOP);
  const places = copiesOf(index, root, 'src/checkout/total.js', '  return Math.floor(net * (1 + VAT) * 100) / 100;', '  return Math.round(net * (1 + VAT) * 100) / 100;');
  assert.deepEqual(places, [{ file: 'src/invoice/amounts.js', line: 5, text: 'const total = Math.floor(net * (1 + VAT) * 100) / 100;' }]);
});

test('a copy is found when something stands in the middle of it', () => {
  const { root, index } = project(SHOP);
  const places = copiesOf(index, root, 'src/loyalty/redeem.js', '  return REWARDS.filter((reward) => points > reward.cost);', '  return REWARDS.filter((reward) => points >= reward.cost);');
  assert.deepEqual(places.map((place) => `${place.file}:${place.line}`), ['src/emails/points.js:4']);
});

test('the other way round too, and a copy that is already fixed is not mentioned', () => {
  const { root, index } = project(SHOP);
  const fromInvoice = copiesOf(index, root, 'src/invoice/amounts.js', '  const total = Math.floor(net * (1 + VAT) * 100) / 100;', '  const total = Math.round(net * (1 + VAT) * 100) / 100;');
  assert.deepEqual(fromInvoice.map((place) => place.file), ['src/checkout/total.js']);
  const fixedAlready = project({ ...SHOP, 'src/invoice/amounts.js': SHOP['src/invoice/amounts.js'].replace('Math.floor', 'Math.round') });
  assert.deepEqual(copiesOf(fixedAlready.index, fixedAlready.root, 'src/checkout/total.js', '  return Math.floor(net * (1 + VAT) * 100) / 100;', '  return Math.round(net * (1 + VAT) * 100) / 100;'), []);
});

test('lines that only look alike are not copies', () => {
  const { root, index } = project(SHOP);
  // the same shape with other names
  assert.deepEqual(copiesOf(index, root, 'src/orders/list.js', '  return orders.map((order) => order.id);', '  return orders.map((order) => order.number);'), []);
  // a line too plain to say anything
  assert.deepEqual(copiesOf(index, root, 'src/orders/list.js', '    if (!order.id) return null;', '    if (!order.id) continue;'), []);
  // the copied lines are still there, and what the change does is add another
  assert.deepEqual(copiesOf(index, root, 'src/checkout/total.js', '  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  return Math.floor(net * (1 + VAT) * 100) / 100;',
    '  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  const gross = net;\n  return Math.floor(net * (1 + VAT) * 100) / 100;'), []);
});

test('tests and comments are never given as the other place', () => {
  const { root, index } = project(SHOP);
  const places = copiesOf(index, root, 'src/checkout/total.js', '  return Math.floor(net * (1 + VAT) * 100) / 100;', '  return Math.round(net * (1 + VAT) * 100) / 100;', { limit: 5 });
  assert.ok(places.every((place) => !place.file.startsWith('test/')));
});

test('a change that moves a whole shared line is told every other place, the nearest first', () => {
  const { root, index } = project(SHOP);
  const line = '  const net = items.reduce((sum, item) => sum + item.price * item.quantity, 0);';
  const places = copiesOf(index, root, 'src/checkout/total.js', line, '  const net = sumOf(items);');
  assert.deepEqual(places.map((place) => place.file), ['src/invoice/amounts.js']);
});

test('the note names the place and shows the line', () => {
  assert.equal(copiesText([{ file: 'src/invoice/amounts.js', line: 5, text: 'const total = Math.floor(net);' }]),
    'Ockham: what this change replaces is also in src/invoice/amounts.js:5:\n    const total = Math.floor(net);\nIf this is a fix, it belongs there too.');
  assert.match(copiesText([{ file: 'a.js', line: 1, text: 'x' }, { file: 'b.js', line: 2, text: 'y' }], 'es'),
    /^Ockham: lo que este cambio sustituye está también en:\n- a\.js:1: x\n- b\.js:2: y\nSi es un arreglo, hace falta también allí\.$/);
});

test('the write hook says it when an edit replaces a copied line, and only once for each place', () => {
  const { root, env } = project(SHOP);
  const edit = (/** @type {string} */ session) => writeContext({ cwd: root, session_id: session, tool_name: 'Edit', tool_input: { file_path: join(root, 'src/checkout/total.js'),
    old_string: '  return Math.floor(net * (1 + VAT) * 100) / 100;', new_string: '  return Math.round(net * (1 + VAT) * 100) / 100;' } }, env);
  assert.equal(edit('s1'), 'Ockham: what this change replaces is also in src/invoice/amounts.js:5:\n    const total = Math.floor(net * (1 + VAT) * 100) / 100;\nIf this is a fix, it belongs there too.');
  assert.equal(edit('s1'), '', 'the same place is not pointed out twice');
  assert.match(edit('s2'), /also in src\/invoice\/amounts\.js:5/);
  assert.deepEqual(readJournal(env).filter((event) => event.event === 'copy').map((event) => event.places), [['src/invoice/amounts.js:5'], ['src/invoice/amounts.js:5']]);
});

test('a whole file written over an existing one is compared with what the file had', () => {
  const { root, env } = project(SHOP);
  const rewritten = SHOP['src/loyalty/redeem.js'].replace('points > reward.cost', 'points >= reward.cost');
  const said = writeContext({ cwd: root, session_id: 's1', tool_name: 'Write', tool_input: { file_path: join(root, 'src/loyalty/redeem.js'), content: rewritten } }, env);
  assert.match(said, /also in src\/emails\/points\.js:4:\n    const within = REWARDS\.filter/);
  const brandNew = writeContext({ cwd: root, session_id: 's2', tool_name: 'Write', tool_input: { file_path: join(root, 'src/new.js'), content: 'export function fresh() {\n  return Math.floor(net * (1 + VAT) * 100) / 100;\n}\n' } }, env);
  assert.equal(brandNew, '', 'a new file replaces nothing');
});
