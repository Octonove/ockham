import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extract } from '../src/index/extract.mjs';
import { stem, words } from '../src/index/words.mjs';

/** @param {string} source @param {string} name */
const find = (source, name) => extract(source).symbols.find((symbol) => symbol.name === name);

test('the forms of a word come out the same', () => {
  for (const [a, b] of [['points', 'point'], ['validation', 'validate'], ['validated', 'validate'], ['shipping', 'ship'],
    ['formatted', 'format'], ['formatter', 'format'], ['redeemable', 'redeem'], ['prices', 'pricing'], ['tries', 'try'],
    ['normalize', 'normal'], ['slugify', 'slug'], ['categories', 'category']]) {
    assert.equal(stem(a), stem(b), `${a} and ${b}`);
  }
});

test('words that only look alike stay apart', () => {
  for (const [a, b] of [['customer', 'custom'], ['checkout', 'check'], ['format', 'form'], ['contact', 'contain'], ['order', 'ordinal']]) {
    assert.notEqual(stem(a), stem(b), `${a} and ${b}`);
  }
});

test('a name written in one piece is read as its words', () => {
  assert.deepEqual(words('parsePage'), ['pars', 'page']);
  assert.deepEqual(words('HTTPClient'), ['http', 'client']);
  assert.deepEqual(words('MAX_UPLOAD_SIZE'), ['max', 'upload', 'size']);
  assert.deepEqual(words('isValidEmail'), ['valid', 'email']);
});

test('words that say nothing are left out, in English and in Spanish, and accents do not count', () => {
  assert.deepEqual(words('Add the date of the order to the receipt'), ['date', 'order', 'receipt']);
  assert.deepEqual(words('Añade la validación del teléfono'), ['anad', 'validacion', 'telefono']);
});

test('numbers of two digits or more are kept, to find a constant by its value', () => {
  assert.deepEqual(words('Show 50 members per page instead of 20'), ['show', '50', 'memb', 'per', 'page', 'instead', '20']);
  assert.deepEqual(words('from 5 MB'), ['mb']);
});

test('functions are found with their parameters, whether exported or not', () => {
  const source = [
    'export function slugify(text) {',
    '  function inner(a) { return a; }',
    '  return inner(text);',
    '}',
    'async function load(url, { retries = 3 } = {}) {}',
    'export default function main() {}',
    'export async function* pages(query) {}',
  ].join('\n');
  assert.deepEqual(extract(source).symbols.map((symbol) => [symbol.name, symbol.kind, symbol.exported, symbol.params]), [
    ['slugify', 'function', true, 'text'],
    ['load', 'function', false, 'url, { retries = 3 } = {}'],
    ['main', 'function', true, ''],
    ['pages', 'function', true, 'query'],
  ]);
});

test('what is nested inside a function or a class is not a symbol of the file', () => {
  const source = 'export class Cart {\n  total() {}\n}\nfunction outer() {\n  const helper = () => 1;\n  function deep() {}\n}\n';
  assert.deepEqual(extract(source).symbols.map((symbol) => symbol.name), ['Cart', 'outer']);
});

test('a constant set to a function is a function', () => {
  assert.equal(find('export const double = (n) => n * 2;', 'double')?.kind, 'function');
  assert.equal(find('export const double = (n) => n * 2;', 'double')?.params, 'n');
  assert.equal(find('const pick = item => item.id;', 'pick')?.params, 'item');
  assert.equal(find('const run = async function (job, options) {};', 'run')?.params, 'job, options');
  assert.equal(find('export const handler = async (\n  request,\n  reply,\n) => {\n};', 'handler')?.params, 'request, reply,');
  assert.equal(find('const total = (net + vat) * 2;', 'total')?.kind, 'constant');
});

test('a constant keeps its value when it is plain arithmetic, and never when its name smells of a secret', () => {
  assert.equal(find('const VAT = 0.21;', 'VAT')?.value, '0.21');
  assert.equal(find('export const MAX_BYTES = 5 * 1024 * 1024; // five megabytes', 'MAX_BYTES')?.value, '5 * 1024 * 1024');
  assert.equal(find("const GREETING = 'hello';", 'GREETING')?.value, undefined);
  assert.equal(find('const API_KEY = 1234567890;', 'API_KEY')?.value, undefined);
  assert.equal(find('const SESSION_TOKEN_BYTES = 32;', 'SESSION_TOKEN_BYTES')?.value, undefined);
  assert.equal(find('const config = { port: 80 };', 'config')?.value, undefined);
});

test('what is exported further down, or the CommonJS way, counts as exported', () => {
  const source = 'function a() {}\nfunction b() {}\nconst c = 1;\nfunction d() {}\nexport { a, b as other };\nmodule.exports = { c };\nexports.d = d;\n';
  assert.deepEqual(extract(source).symbols.map((symbol) => [symbol.name, symbol.exported]), [['a', true], ['b', true], ['c', true], ['d', true]]);
});

test('the comment above gives the first sentence, and the rest apart', () => {
  const source = [
    '/**',
    ' * Is this something we can send mail to? Checked the same way everywhere:',
    ' * there is exactly one @.',
    ' * @param {string} text',
    ' */',
    'export function isEmail(text) {}',
    '',
    '// Money is kept in cents. Every page writes it the same way.',
    'export function formatMoney(cents) {}',
    '',
    '/** Licence text that belongs to the file, not to what follows. */',
    '',
    'export function free() {}',
  ].join('\n');
  assert.equal(find(source, 'isEmail')?.doc, 'Is this something we can send mail to?');
  assert.equal(find(source, 'isEmail')?.more, 'Checked the same way everywhere: there is exactly one @.');
  assert.equal(find(source, 'formatMoney')?.doc, 'Money is kept in cents.');
  assert.equal(find(source, 'free')?.doc, undefined);
});

test('a comment that is a list gives its first line, not the whole list', () => {
  const source = '/**\n * order: { total } in cents\n * discount: { type, value } or nothing\n */\nexport function applyDiscount(order, discount) {}';
  assert.equal(find(source, 'applyDiscount')?.doc, 'order: { total } in cents');
});

test('imports are listed once each, however they are written', () => {
  const source = [
    "import { a } from './a.js';",
    "import './side-effect.js';",
    'import {',
    '  b,',
    "} from '../lib/b.js';",
    "export { c } from './c.js';",
    "const d = require('./d.js');",
    "const lazy = () => import('./e.js');",
    "import fs from 'node:fs';",
    "import { a as again } from './a.js';",
  ].join('\n');
  assert.deepEqual(extract(source).imports.sort(), ['../lib/b.js', './a.js', './c.js', './d.js', './e.js', './side-effect.js', 'node:fs']);
  assert.deepEqual(extract(source).symbols.map((symbol) => symbol.name), ['d', 'lazy']);
});

test('TypeScript declarations are read like the JavaScript they become', () => {
  const source = 'export const limit: number = 20;\nexport abstract class Store {}\nexport function parse(text: string): Row[] {}\n';
  assert.deepEqual(extract(source).symbols.map((symbol) => [symbol.name, symbol.kind]), [['limit', 'constant'], ['Store', 'class'], ['parse', 'function']]);
  assert.equal(find(source, 'limit')?.value, '20');
});

test('text that is not code gives nothing and does not throw', () => {
  assert.deepEqual(extract(''), { symbols: [], imports: [] });
  assert.deepEqual(extract('just some words\n== and more ==\n').symbols, []);
});
