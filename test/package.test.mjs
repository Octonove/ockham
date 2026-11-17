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

test('the Codex plugin is the same plugin: same name and version, and its hooks are the same scripts on the same events', () => {
  const codex = json('.codex-plugin/plugin.json');
  assert.equal(codex.name, json('.claude-plugin/plugin.json').name);
  assert.equal(codex.version, json('package.json').version);
  assert.equal(codex.hooks, './hooks/codex.json');
  /** @param {Record<string, any[]>} hooks @param {(hook: Record<string, any>) => string} script */
  const scripts = (hooks, script) => Object.fromEntries(Object.entries(hooks).map(([event, groups]) => [event, groups.flatMap((group) => group.hooks.map(script))]));
  const claude = scripts(json('hooks/hooks.json').hooks, (hook) => hook.args[0].replace('${CLAUDE_PLUGIN_ROOT}/', ''));
  const forCodex = scripts(json('hooks/codex.json').hooks, (hook) => {
    assert.equal(hook.type, 'command');
    const [, rel] = /^node "\$\{PLUGIN_ROOT\}\/(hooks\/[a-z-]+\.mjs)"$/.exec(hook.command) ?? [];
    assert.ok(rel, `a command Codex cannot run from the plugin: ${hook.command}`);
    assert.ok(existsSync(fileURLToPath(new URL(rel, root))), `missing ${rel}`);
    return rel;
  });
  assert.deepEqual(forCodex, claude);
  // Codex writes files with apply_patch: the write hook has to be called on it.
  assert.match(json('hooks/codex.json').hooks.PreToolUse[0].matcher, /(?:^|\|)apply_patch(?:\||$)/);
});

test('the repository is a marketplace for Codex too, with the plugin at its root', () => {
  const market = json('.agents/plugins/marketplace.json');
  const [plugin] = market.plugins;
  assert.equal(market.plugins.length, 1);
  assert.equal(plugin.name, 'ockham');
  assert.deepEqual(plugin.source, { source: 'local', path: './' });
  assert.ok(plugin.policy.installation && plugin.policy.authentication && plugin.category, 'Codex needs a policy and a category');
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

test('the CLI indexes a folder and finds what it has for a request', async () => {
  const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const base = mkdtempSync(join(tmpdir(), 'ockham-cli-test-'));
  const here = process.cwd();
  try {
    const root = join(base, 'shop');
    mkdirSync(join(root, 'src', 'lib'), { recursive: true });
    writeFileSync(join(root, 'src', 'lib', 'text.js'), '/** Turn any text into an identifier for URLs. */\nexport function slugify(text) {}\n');
    writeFileSync(join(root, 'src', 'catalog.js'), "import { slugify } from './lib/text.js';\nexport function productUrl(product) {}\n");
    const env = { OCKHAM_CACHE_DIR: join(base, 'cache') };
    /** @type {string[]} */
    const lines = [];
    /** @param {string} line */
    const out = (line) => { lines.push(line); };

    assert.equal(await main(['index', root], out, env), 0);
    assert.match(lines[0], /2 source files, 2 symbols, 2 of them exported\.$/);
    assert.match(lines[1], /^2 file\(s\) read in \d+ ms\. The index is kept in /);
    assert.match(lines[2], /- slugify\(text\) in src\/lib\/text\.js - Turn any text into an identifier for URLs\./);

    process.chdir(root);
    lines.length = 0;
    assert.equal(await main(['find', 'identifier', 'for', 'the', 'URLs', 'of', 'a', 'text'], out, env), 0);
    assert.deepEqual(lines, ['slugify(text) in src/lib/text.js:2 - Turn any text into an identifier for URLs.']);
    lines.length = 0;
    assert.equal(await main(['find', 'nothing', 'like', 'this'], out, env), 0);
    assert.deepEqual(lines, ['Nothing in this project is named after those words.']);
    assert.equal(await main(['find'], out, env), 1);
  } finally {
    process.chdir(here);
    rmSync(base, { recursive: true, force: true, maxRetries: 3 });
  }
});
