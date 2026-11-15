import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadTasks } from '../bench/lib/tasks.mjs';
import { listFiles } from '../bench/lib/workspace.mjs';

const tasks = loadTasks();
const FIELDS = ['correct', 'safe', 'reach', 'reuse', 'lean', 'deps'];

test('every task says what it is and what its references must fail', () => {
  for (const task of tasks) {
    for (const key of ['title', 'kind', 'prompt', 'badFails']) assert.equal(typeof task[key], 'string', `${task.id}: ${key}`);
    assert.equal(typeof task.needsTest, 'boolean', `${task.id}: needsTest`);
    for (const [ref, field] of Object.entries({ good: null, bad: task.badFails, ...task.refs })) {
      assert.ok(existsSync(join(task.dir, 'refs', ref)), `${task.id}: refs/${ref} is missing`);
      if (field !== null) assert.ok(FIELDS.includes(field), `${task.id}: "${field}" is not a measure`);
    }
    assert.ok(existsSync(join(task.dir, 'check.mjs')), `${task.id}: check.mjs is missing`);
    assert.ok(existsSync(join(task.dir, 'seed', 'package.json')), `${task.id}: its seed needs a package.json to run on its own`);
  }
});

test('a measure a reference must fail is one the task takes', () => {
  for (const task of tasks) {
    const fields = [task.badFails, ...Object.values(task.refs ?? {})];
    if (fields.includes('lean')) assert.ok((task.budgetLines ?? 0) > 0, `${task.id}: "lean" needs budgetLines`);
    if (fields.includes('reuse')) assert.ok(task.reuse, `${task.id}: "reuse" needs a reuse rule`);
  }
});

test('no two tasks write the same file, so their projects can be laid over one another', () => {
  /** @type {Map<string, string>} */
  const owner = new Map();
  for (const task of tasks) {
    const files = new Set([...listFiles(join(task.dir, 'seed')), ...listFiles(join(task.dir, 'refs', 'good'))]);
    for (const file of files) {
      if (file === 'package.json') continue;
      assert.equal(owner.get(file), undefined, `${file} is written by ${owner.get(file)} and by ${task.id}`);
      owner.set(file, task.id);
    }
  }
});
