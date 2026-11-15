import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';

import { contextOutput, parseInput, readStdin } from '../src/hookio.mjs';

test('parseInput reads a JSON object, with or without a byte-order mark', () => {
  assert.deepEqual(parseInput('{"a":1}'), { a: 1 });
  assert.deepEqual(parseInput(String.fromCharCode(0xfeff) + '{"a":1}'), { a: 1 });
});

test('parseInput gives {} for anything that is not a JSON object', () => {
  for (const bad of ['', 'not json', '[1,2]', '"text"', 'null', '{"a":']) {
    assert.deepEqual(parseInput(bad), {}, `input: ${bad}`);
  }
});

test('contextOutput is the shape the hosts read', () => {
  assert.deepEqual(JSON.parse(contextOutput('SessionStart', 'hello')), {
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'hello' },
  });
});

test('readStdin resolves with the data when stdin ends', async () => {
  const stdin = new PassThrough();
  const reading = readStdin(5000, stdin);
  stdin.write('{"a":');
  stdin.end('1}');
  assert.equal(await reading, '{"a":1}');
});

test('readStdin gives up after the timeout and keeps what arrived', async () => {
  const stdin = new PassThrough();
  const started = Date.now();
  const reading = readStdin(50, stdin);
  stdin.write('partial');
  assert.equal(await reading, 'partial');
  assert.ok(Date.now() - started < 2000, 'returned without waiting for an end that never comes');
});

test('readStdin resolves on a stream error', async () => {
  const stdin = new PassThrough();
  const reading = readStdin(5000, stdin);
  stdin.destroy(new Error('broken pipe'));
  assert.equal(await reading, '');
});
