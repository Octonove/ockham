import assert from 'node:assert/strict';
import { test } from 'node:test';

import { median, report } from '../bench/lib/report.mjs';

const score = (over = {}) => ({ correct: true, safe: true, reach: null, reuse: null, lean: null, depsAdded: [], sourceLinesAdded: 4, wroteTests: false, ...over });
const cell = (task, kind, arm, over, needsTest = false) => ({ task, kind, arm, n: 1, needsTest, agent: { ok: true, costUsd: 0.1, durationMs: 12000, models: ['model-x'] }, score: score(over) });

test('median of an odd and an even number of values', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
});

test('the report counts each measure only over the tasks that take it', () => {
  const text = report({
    stamp: 'S', model: 'sonnet', arms: ['baseline', 'ockham'], runs: 1,
    results: [
      cell('reuse-a', 'reuse', 'baseline', { reuse: false, correct: false }),
      cell('reuse-a', 'reuse', 'ockham', { reuse: true }),
      cell('size-a', 'size', 'baseline', { lean: false, sourceLinesAdded: 40 }),
      cell('size-a', 'size', 'ockham', { lean: true }),
      cell('dep-a', 'dependency', 'baseline', { depsAdded: ['lodash'] }, true),
      cell('dep-a', 'dependency', 'ockham', { wroteTests: true }, true),
    ],
  });
  const row = (start) => text.split('\n').find((line) => line.startsWith(start))?.split('|').map((part) => part.trim());
  // arm | correct | safe | reach | reuse | dependency | size budget | test | lines | cost | time
  assert.deepEqual(row('| baseline |')?.slice(2, 9), ['2/3', '3/3', 'n/a', '0/1', '1/3', '0/1', '0/1']);
  assert.deepEqual(row('| ockham |')?.slice(2, 9), ['3/3', '3/3', 'n/a', '1/1', '0/3', '1/1', '1/1']);
  assert.deepEqual(row('| reuse |')?.slice(3, 5), ['0/1', '1/1']);
  assert.deepEqual(row('| dependency |')?.slice(3, 5), ['0/1', '1/1']);
  assert.match(text, /Model: sonnet \(model-x\)/);
  assert.match(text, /OVER THE SIZE BUDGET/);
});

test('a session that did not run is counted and left out of the measures', () => {
  const failed = { task: 'reuse-a', kind: 'reuse', arm: 'baseline', n: 1, needsTest: false, agent: { ok: false, error: 'timed out' }, score: null };
  const text = report({ stamp: 'S', model: 'sonnet', arms: ['baseline'], runs: 1, results: [failed, cell('size-a', 'size', 'baseline', { lean: true })] });
  assert.match(text, /2 sessions, 1 of them failed to run/);
  assert.match(text, /\| `reuse-a` \| reuse \| did not run \|/);
});
