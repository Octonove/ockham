#!/usr/bin/env node
// Live contract test for the hooks in Codex: does what a hook prints reach the model, and do
// the checks at the end stop a session that leaves something behind? The Codex side of what
// bench/hook-live.mjs proves for Claude Code (D22). It starts real Codex sessions, so it needs
// a logged-in Codex with the plugin added and spends a little quota:
//
//   codex plugin marketplace add Octonove/ockham     (or the path of this repository)
//   codex plugin add ockham@ockham
//   node bench/hook-live-codex.mjs [--model <model>] [--plugin ockham@ockham]
//
// The sessions run with --dangerously-bypass-hook-trust, so the hooks need not have been
// reviewed yet, and --ephemeral, so they leave no history. Every case runs in a new folder.
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { cellEnv } from './lib/agent.mjs';
import { readJournal } from '../src/journal.mjs';

const at = process.argv.indexOf('--model');
const model = at > 0 ? process.argv[at + 1] : '';
// The plugin under test, as Codex names it: name@marketplace. A copy added under another name
// (--plugin ockham@ockham-dev) is tested with the usual one turned off, so that only one answers.
const named = process.argv.indexOf('--plugin');
const pluginId = named > 0 ? process.argv[named + 1] : 'ockham@ockham';
// --only <words> runs the cases whose name has them; --keep leaves each case's folder, with the
// session's events (codex.jsonl) and Ockham's journal, and prints where.
const only = process.argv.indexOf('--only') > 0 ? process.argv[process.argv.indexOf('--only') + 1] : '';
const keep = process.argv.includes('--keep');

/** The codex program: CODEX_BIN, the one the desktop app keeps on Windows, or codex on the PATH. */
function codexBin(env = process.env) {
  if (env.CODEX_BIN) return env.CODEX_BIN;
  if (process.platform === 'win32' && env.LOCALAPPDATA) {
    const dir = join(env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    const found = existsSync(dir)
      ? readdirSync(dir).map((name) => join(dir, name, 'codex.exe')).filter((file) => existsSync(file)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
      : [];
    if (found.length) return found[0];
  }
  return 'codex';
}

/**
 * One Codex session, with the plugin on or off, and its last message.
 * @param {{ prompt: string, cwd: string, env: Record<string, string>, plugin: boolean }} cell
 * @returns {Promise<{ ok: boolean, reply: string, wallMs: number }>}
 */
function runCodex({ prompt, cwd, env, plugin }) {
  return new Promise((resolve) => {
    const out = join(dirname(cwd), 'reply.txt');
    const args = ['exec', '--dangerously-bypass-hook-trust', '--ephemeral', '--skip-git-repo-check', '-s', 'workspace-write', '-C', cwd, '-o', out, '--json',
      ...(plugin ? (pluginId === 'ockham@ockham' ? [] : ['-c', 'plugins."ockham@ockham".enabled=false']) : ['--disable', 'plugins']),
      ...(model ? ['-m', model] : []), prompt];
    const started = Date.now();
    const log = openSync(join(dirname(cwd), 'codex.jsonl'), 'w');
    const child = spawn(codexBin(), args, { env, stdio: ['ignore', log, log] });
    const timer = setTimeout(() => child.kill(), 360_000);
    child.on('error', () => { clearTimeout(timer); resolve({ ok: false, reply: '', wallMs: Date.now() - started }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      closeSync(log);
      let reply = '';
      try {
        reply = readFileSync(out, 'utf8');
      } catch {
        // no last message: the session failed
      }
      resolve({ ok: code === 0, reply, wallMs: Date.now() - started });
    });
  });
}

const canary = `ockham-${randomBytes(4).toString('hex')}`;
const prompt = 'A hook may have added a canary word to your context. Reply with that word and nothing else. If there is none, reply NONE.';
const helper = `fold${randomBytes(3).toString('hex')}`;
const PROJECT = {
  'src/lib/text.js': `/** Turn a title into the last part of an address. */\nexport function ${helper}(title) {\n  return title.trim().toLowerCase().split(' ').join('-');\n}\n`,
  'src/pages/list.js': `import { ${helper} } from '../lib/text.js';\n\nexport function pageAddress(page) {\n  return ${helper}(page.title);\n}\n`,
  'src/prices/shelf.js': 'const RATE = 0.21;\n\nexport function shelfPrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
  'src/prices/quote.js': 'const RATE = 0.21;\n\nexport function quotePrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
};
const TESTED = {
  'package.json': '{ "name": "shop", "type": "module", "scripts": { "test": "node --test test/" } }',
  'test/shelf.test.js': "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\n\nimport { shelfPrice } from '../src/prices/shelf.js';\n\ntest('a price has two decimals', () => {\n  assert.equal(shelfPrice(10), 12.1);\n});\n",
};
const sharedPrompt = 'Do not read any file. A hook may have listed helper functions that this project already has. Reply with the name of the first function in that list and nothing else. If no such list was given, reply NONE.';
// Codex sometimes writes a file with a shell command, which no hook sees (D22): the requests that
// test what is said when it writes ask for apply_patch by name.
const twinPrompt = `Using the apply_patch tool, create the file src/new.js with exactly this content and change nothing else:\nexport function ${helper}(title) { return title; }\nA hook may then tell you where the project already has a function of that name. Reply with that file path and nothing else. If you were told nothing, reply NONE.`;
const copyPrompt = 'In src/prices/shelf.js replace Math.floor with Math.round, with one apply_patch edit, and change nothing else. A hook may then tell you where else the project has the line you replaced. Reply with that file path and nothing else. If you were told nothing, reply NONE.';
const stopCanary = `ockham-stop-${randomBytes(4).toString('hex')}`;
const stopRule = 'If at any point you are told a stop word, your whole reply must be that word and nothing else.';
const stopPrompt = `In src/prices/shelf.js replace Math.floor with Math.round, with one apply_patch edit. Change no other file, whatever you are told. Then reply DONE. ${stopRule}`;
const runPrompt = `First run the command \`node --version\`. Then in src/prices/shelf.js replace Math.floor with Math.round, with one apply_patch edit. Run nothing else and change no other file, whatever you are told. Then reply DONE. ${stopRule}`;
/** @typedef {Record<string, any>[]} Journal */
/** @param {Journal} journal @param {string} event @param {string} [check] */
const did = (journal, event, check) => journal.some((one) => one.event === event && (!check || (one.checks ?? []).includes(check)));

// Each control is the same request with plugins off (--disable plugins): the word is in the
// environment both times, so if it shows up there too it did not come through the hook.
const cases = [
  { name: 'with the plugin the word reaches the model', plugin: true, prompt, expect: (/** @type {string} */ reply) => reply.includes(canary) },
  { name: 'without the plugin it does not', plugin: false, prompt, expect: (/** @type {string} */ reply) => !reply.includes(canary) },
  { name: 'at the start the session is told what the project shares', plugin: true, project: true, prompt: sharedPrompt, expect: (/** @type {string} */ reply) => reply.includes(helper) },
  { name: 'without the plugin it is told nothing', plugin: false, project: true, prompt: sharedPrompt, expect: (/** @type {string} */ reply) => !reply.includes(helper) },
  { name: 'writing a second version of a helper with apply_patch is pointed out', plugin: true, project: true, prompt: twinPrompt,
    expect: (/** @type {string} */ reply, /** @type {Journal} */ journal) => reply.includes('src/lib/text.js') && did(journal, 'twin') },
  { name: 'replacing a copied line with apply_patch is told where the other copy is', plugin: true, project: true, prompt: copyPrompt,
    expect: (/** @type {string} */ reply, /** @type {Journal} */ journal) => reply.includes('src/prices/quote.js') && did(journal, 'copy') },
  { name: 'a task that leaves a copy unfixed is stopped once and told', plugin: true, project: true, checks: true, prompt: stopPrompt,
    expect: (/** @type {string} */ reply, /** @type {Journal} */ journal) => reply.includes(stopCanary) && did(journal, 'check', 'copy') },
  { name: 'a session with a shell is asked to run the tests it did not run', plugin: true, project: true, tested: true, checks: true, prompt: runPrompt,
    expect: (/** @type {string} */ reply, /** @type {Journal} */ journal) => reply.includes(stopCanary) && did(journal, 'check', 'run') },
];

let failed = 0;
for (const item of cases.filter((one) => one.name.includes(only))) {
  const base = mkdtempSync(join(tmpdir(), 'ockham-hook-live-codex-'));
  const cwd = join(base, 'project');
  mkdirSync(cwd);
  for (const [rel, text] of Object.entries({ ...(item.project ? PROJECT : {}), ...(item.tested ? TESTED : {}) })) {
    mkdirSync(dirname(join(cwd, rel)), { recursive: true });
    writeFileSync(join(cwd, rel), text);
  }
  // As in the test for Claude Code: the rules are off, the index is kept next to the project, and the checks are on only in their own cases.
  const env = { ...cellEnv(), OCKHAM_RULES: 'off', OCKHAM_CANARY: canary, OCKHAM_STOP_CANARY: stopCanary, OCKHAM_CHECKS: item.checks ? 'copy,run' : 'off', OCKHAM_CACHE_DIR: join(base, 'cache') };
  const result = await runCodex({ prompt: item.prompt, cwd, env, plugin: item.plugin });
  const journal = readJournal({ OCKHAM_CACHE_DIR: join(base, 'cache') });
  if (keep) console.log(`     kept in ${base}`);
  else rmSync(base, { recursive: true, force: true, maxRetries: 3 });
  const ok = result.ok && item.expect(result.reply, journal);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${item.name}  -> ${JSON.stringify(result.reply.trim().slice(0, 80))}  (${(result.wallMs / 1000).toFixed(0)} s)`);
}
console.log(failed ? `\n${failed} case(s) failed.` : '\nIn Codex too, every hook reaches the session, when it starts, when it writes and when it means to finish.');
process.exitCode = failed ? 1 : 0;
