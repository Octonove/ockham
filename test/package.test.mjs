import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main } from '../src/cli.mjs';

const root = new URL('../', import.meta.url);
/** @param {string} rel */
const json = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));

test('the plugin manifest and package.json carry the same version', () => {
  assert.equal(json('.claude-plugin/plugin.json').version, json('package.json').version);
});

test('every hook command points at a file that exists', () => {
  const hooks = json('hooks/hooks.json').hooks;
  const files = [];
  for (const groups of Object.values(hooks)) {
    for (const group of groups) {
      for (const hook of group.hooks) {
        assert.equal(hook.type, 'command');
        assert.equal(hook.command, 'node');
        for (const arg of hook.args) files.push(arg.replace('${CLAUDE_PLUGIN_ROOT}/', ''));
      }
    }
  }
  assert.ok(files.length > 0);
  for (const rel of files) assert.ok(existsSync(fileURLToPath(new URL(rel, root))), `missing ${rel}`);
});

test('the package has no runtime dependencies', () => {
  assert.equal(json('package.json').dependencies, undefined);
});

test('the CLI prints its version and its help, and rejects what it does not know', async () => {
  /** @type {string[]} */
  const lines = [];
  /** @param {string} line */
  const out = (line) => { lines.push(line); };
  assert.equal(await main(['--version'], out), 0);
  assert.equal(lines.pop(), json('package.json').version);
  assert.equal(await main([], out), 0);
  assert.match(lines.pop() ?? '', /smallest change that works/);
  assert.equal(await main(['nope'], out), 1);
  assert.match(lines.pop() ?? '', /Unknown command: nope/);
});
