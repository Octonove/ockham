import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { copiesOf, inCommon, linesTakenAway, namesIn, shapeOf, tokens } from '../src/index/copies.mjs';
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

const PRICES = {
  'src/promo/price.js': 'export function promoPrice(cents, percent) {\n  return cents - Math.floor(cents * percent / 100);\n}\n',
  'src/quotes/line.js': 'export function quoteLine(unitCents, quantity, agreedPercent) {\n  const unit = unitCents - Math.floor(unitCents * agreedPercent / 100);\n  return { unit, total: unit * quantity };\n}\n',
  // The same words in another sum, and the same sum already put right: neither is a copy.
  'src/stats/share.js': 'export function share(part, whole) {\n  return Math.floor(part / whole * 100);\n}\n',
  'src/refunds/amount.js': 'export function refundAmount(paid, rate) {\n  return paid - Math.round(paid * rate / 100);\n}\n',
};

test("a line's shape is its tokens with the names it gives to its own things blanked", () => {
  const own = shapeOf(tokens('x'), new Set())[0];
  assert.deepEqual(shapeOf(tokens('return cents - Math.floor(cents * percent / 100);'), new Set()),
    ['return', own, '-', 'Math', '.', 'floor', '(', own, '*', own, '/', '100', ')', ';']);
  // What follows a dot, and what the project defines, say what the line is about and stay.
  assert.deepEqual(shapeOf(tokens('total = formatMoney(order.total)'), new Set(['formatMoney'])), [own, '=', 'formatMoney', '(', own, '.', 'total', ')']);
});

test('a copy with other names for its own things is found by its shape', () => {
  const { root, index } = project(PRICES);
  const places = copiesOf(index, root, 'src/promo/price.js', '  return cents - Math.floor(cents * percent / 100);', '  return cents - Math.round(cents * percent / 100);');
  assert.deepEqual(places.map((place) => `${place.file}:${place.line}`), ['src/quotes/line.js:2']);
  // And the other way round, from the copy to the first.
  const back = copiesOf(index, root, 'src/quotes/line.js', '  const unit = unitCents - Math.floor(unitCents * agreedPercent / 100);', '  const unit = unitCents - Math.round(unitCents * agreedPercent / 100);');
  assert.deepEqual(back.map((place) => `${place.file}:${place.line}`), ['src/promo/price.js:2']);
});

test('a shape that is anchored by nothing, or that lost nothing, points nowhere', () => {
  const { root, index } = project(SHOP);
  // The two list files have line after line of the same shape, and not a word in them that says what they are about.
  assert.deepEqual(copiesOf(index, root, 'src/orders/list.js', '    if (!order.id) return null;', '    if (order.id === undefined) return null;'), []);
  assert.deepEqual(copiesOf(index, root, 'src/orders/list.js', '  return orders.map((order) => order.id);', '  return orders.map((order) => String(order.id));'), []);
  const prices = project(PRICES);
  // Only a name changed: the line lost nothing that another line has.
  assert.deepEqual(copiesOf(prices.index, prices.root, 'src/promo/price.js', '  return cents - Math.floor(cents * percent / 100);', '  return amount - Math.floor(amount * percent / 100);'), []);
});

const AGES = {
  'src/signup/age.js': 'export function oldEnough(birth, today) {\n  const years = today.getFullYear() - birth.getFullYear();\n  const hadBirthday = today.getMonth() > birth.getMonth();\n  return (hadBirthday ? years : years - 1) >= 18;\n}\n',
  'src/delivery/handover.js': "export function handoverNote(parcel, birth, today) {\n  const years = today.getFullYear() - birth.getFullYear();\n  const hadBirthday = today.getMonth() > birth.getMonth();\n  const adult = (hadBirthday ? years : years - 1) > 18;\n  return adult ? 'yes' : 'no';\n}\n",
};

test('a change that makes its file call another one is not pointed back at that one', () => {
  const { root, index } = project(AGES);
  const copied = '  const years = today.getFullYear() - birth.getFullYear();\n  const hadBirthday = today.getMonth() > birth.getMonth();\n  const adult = (hadBirthday ? years : years - 1) > 18;';
  // The copy is taken out and the first file's function called: its lines are where they belong.
  assert.deepEqual(copiesOf(index, root, 'src/delivery/handover.js', copied, '  const adult = oldEnough(birth, today);'), []);
  // The same lines rewritten without calling anybody are still a change to something that is in two files.
  const rewritten = copiesOf(index, root, 'src/delivery/handover.js', copied, '  const adult = ageOn(today, birth) >= 18;');
  assert.deepEqual(rewritten.map((place) => place.file), ['src/signup/age.js', 'src/signup/age.js']);
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
