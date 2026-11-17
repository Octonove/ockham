import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fileWrites, fromHost, patchCalls } from '../src/host.mjs';

// A patch as Codex sends it in tool_input.command: full paths with forward slashes.
const patch = (/** @type {string[]} */ ...lines) => ['*** Begin Patch', ...lines, '*** End Patch'].join('\n');

test('a new file in a patch is a Write with its whole content', () => {
  assert.deepEqual(patchCalls(patch('*** Add File: C:/shop/src/sub.js', '+export function sub(a, b) {', '+  return a - b;', '+}')), [
    { tool_name: 'Write', tool_input: { file_path: 'C:/shop/src/sub.js', content: 'export function sub(a, b) {\n  return a - b;\n}\n' } },
  ]);
});

test('a changed file is a MultiEdit with one edit for each hunk, its context on both sides', () => {
  const calls = patchCalls(patch(
    '*** Update File: src/prices/shelf.js',
    '@@ export function shelfPrice(net) {',
    '-  return Math.floor(net * (1 + RATE) * 100) / 100;',
    '+  return Math.round(net * (1 + RATE) * 100) / 100;',
    '@@',
    ' const RATE = 0.21;',
    '',
    '-const LABEL = "VAT";',
    '+const LABEL = "IVA";',
  ));
  assert.deepEqual(calls, [{ tool_name: 'MultiEdit', tool_input: { file_path: 'src/prices/shelf.js', edits: [
    { old_string: '  return Math.floor(net * (1 + RATE) * 100) / 100;', new_string: '  return Math.round(net * (1 + RATE) * 100) / 100;' },
    { old_string: 'const RATE = 0.21;\n\nconst LABEL = "VAT";', new_string: 'const RATE = 0.21;\n\nconst LABEL = "IVA";' },
  ] } }]);
});

test('one patch for several files gives one call for each, in order; a file that goes is only put aside, and a move goes from one place to the other', () => {
  const calls = patchCalls(patch(
    '*** Add File: a.js', '+export const a = 1;',
    '*** Delete File: b.js',
    '*** Update File: old/c.js', '*** Move to: new/c.js', '@@', '-export const c = 1;', '+export const c = 2;',
    '*** End of File',
  ));
  assert.deepEqual(calls.map((call) => [call.tool_name, call.tool_input.file_path]), [['Write', 'a.js'], ['Delete', 'b.js'], ['Delete', 'old/c.js'], ['MultiEdit', 'new/c.js']]);
});

test('what a patch says that cannot be read is skipped, and a patch that is not one gives nothing', () => {
  assert.deepEqual(patchCalls('git diff --stat'), []);
  assert.deepEqual(patchCalls(''), []);
  // An update with no change in it writes nothing.
  assert.deepEqual(patchCalls(patch('*** Update File: a.js', '@@')), []);
  // Lines before the first file and lines that are not part of a hunk are left alone.
  assert.deepEqual(patchCalls(patch('stray text', '*** Update File: a.js', '?? not a hunk line', '-x', '+y')), [
    { tool_name: 'MultiEdit', tool_input: { file_path: 'a.js', edits: [{ old_string: 'x', new_string: 'y' }] } },
  ]);
});

test('Codex names a request by its turn_id, which stands in for the prompt_id of Claude Code', () => {
  assert.equal(fromHost({ turn_id: 't1' }).prompt_id, 't1');
  assert.equal(fromHost({ turn_id: 't1', prompt_id: 'p1' }).prompt_id, 'p1');
  assert.equal(fromHost({}).prompt_id, undefined);
});

test('the calls of Claude Code pass as they are, and a Codex patch becomes one call for each file, with the rest of its input', () => {
  const edit = { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'a.js', old_string: 'x', new_string: 'y' } };
  assert.deepEqual(fileWrites(edit), [edit]);
  const calls = fileWrites({ session_id: 's', turn_id: 't', cwd: '/shop', tool_name: 'apply_patch', tool_input: { command: patch('*** Add File: a.js', '+1', '*** Add File: b.js', '+2') } });
  assert.deepEqual(calls.map((call) => [call.session_id, call.prompt_id, call.cwd, call.tool_name, call.tool_input.file_path]), [['s', 't', '/shop', 'Write', 'a.js'], ['s', 't', '/shop', 'Write', 'b.js']]);
  // A shell command is not a write: it passes as it came, and the write hook does nothing with it.
  assert.deepEqual(fileWrites({ tool_name: 'Bash', tool_input: { command: 'ls' } }), [{ tool_name: 'Bash', tool_input: { command: 'ls' } }]);
});
