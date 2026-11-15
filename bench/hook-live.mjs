#!/usr/bin/env node
// Live contract test for the hooks: does what a hook prints reach the model?
// It starts real Claude Code sessions, so it needs a logged-in Claude Code and
// spends a little quota. That is why it is not part of `npm test`.
//
//   node bench/hook-live.mjs [--model haiku]
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { cellEnv, runClaude } from './lib/agent.mjs';

const at = process.argv.indexOf('--model');
const model = at > 0 ? process.argv[at + 1] : 'haiku';
const canary = `ockham-${randomBytes(4).toString('hex')}`;
const prompt = 'A hook may have added a canary word to your context. Reply with that word and nothing else. If there is none, reply NONE.';
// A subagent has its own word, which the session is never told: if the session's answer
// carries it, the subagent got it from its own hook and passed it up.
const subCanary = `ockham-sub-${randomBytes(4).toString('hex')}`;
const subPrompt = 'Start one subagent with the Agent tool and give it exactly this prompt: "A hook may have added a subagent canary word to your context. Reply with that word and nothing else. If there is none, reply NONE." Then reply with exactly what the subagent answered, and nothing else.';

// The index has no word of its own to pass on: what it says is about the project. So the
// project is made for the test, with names that could not be guessed, and the model is
// asked for what only the index could have told it.
const helper = `fold${randomBytes(3).toString('hex')}`;
const PROJECT = {
  'src/lib/text.js': `/** Turn a title into the last part of an address. */\nexport function ${helper}(title) {\n  return title.trim().toLowerCase().split(' ').join('-');\n}\n`,
  'src/pages/list.js': `import { ${helper} } from '../lib/text.js';\n\nexport function pageAddress(page) {\n  return ${helper}(page.title);\n}\n`,
  'src/prices/shelf.js': 'const RATE = 0.21;\n\nexport function shelfPrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
  'src/prices/quote.js': 'const RATE = 0.21;\n\nexport function quotePrice(net) {\n  return Math.floor(net * (1 + RATE) * 100) / 100;\n}\n',
};
const sharedPrompt = 'A hook may have listed helper functions that this project already has. Reply with the name of the first function in that list and nothing else. If no such list was given, reply NONE.';
const twinPrompt = `Create the file src/new.js with exactly this content and change nothing else:\nexport function ${helper}(title) { return title; }\nA hook may then tell you where the project already has a function of that name. Reply with that file path and nothing else. If you were told nothing, reply NONE.`;
const copyPrompt = 'In src/prices/shelf.js replace Math.floor with Math.round, with one edit, and change nothing else. A hook may then tell you where else the project has the line you replaced. Reply with that file path and nothing else. If you were told nothing, reply NONE.';

// Every second case is the control: the same request without the plugin. The word is in
// the environment both times, so if it shows up there too it did not come through the hook.
const cases = [
  { name: 'with the plugin the word reaches the model', arm: 'ockham', prompt, expect: (/** @type {string} */ reply) => reply.includes(canary) },
  { name: 'without the plugin it does not', arm: 'baseline', prompt, expect: (/** @type {string} */ reply) => !reply.includes(canary) },
  { name: 'with the plugin a subagent gets its own word', arm: 'ockham', prompt: subPrompt, tools: ['Agent'], expect: (/** @type {string} */ reply) => reply.includes(subCanary) },
  { name: 'without the plugin a subagent does not', arm: 'baseline', prompt: subPrompt, tools: ['Agent'], expect: (/** @type {string} */ reply) => !reply.includes(subCanary) },
  { name: 'at the start the session is told what the project shares', arm: 'ockham', project: true, prompt: sharedPrompt, tools: ['Read'], expect: (/** @type {string} */ reply) => reply.includes(helper) },
  { name: 'without the plugin it is told nothing', arm: 'baseline', project: true, prompt: sharedPrompt, tools: ['Read'], expect: (/** @type {string} */ reply) => !reply.includes(helper) },
  { name: 'writing a second version of a helper is pointed out', arm: 'ockham', project: true, prompt: twinPrompt, tools: ['Write'], expect: (/** @type {string} */ reply) => reply.includes('src/lib/text.js') },
  { name: 'without the plugin it is not', arm: 'baseline', project: true, prompt: twinPrompt, tools: ['Write'], expect: (/** @type {string} */ reply) => !reply.includes('src/lib/text.js') },
  { name: 'replacing a copied line is told where the other copy is', arm: 'ockham', project: true, prompt: copyPrompt, tools: ['Read', 'Edit'], expect: (/** @type {string} */ reply) => reply.includes('src/prices/quote.js') },
  { name: 'without the plugin it is not', arm: 'baseline', project: true, prompt: copyPrompt, tools: ['Read', 'Edit'], expect: (/** @type {string} */ reply) => !reply.includes('src/prices/quote.js') },
];

let failed = 0;
for (const item of cases) {
  const base = mkdtempSync(join(tmpdir(), 'ockham-hook-live-'));
  const cwd = join(base, 'project');
  mkdirSync(cwd);
  for (const [rel, text] of Object.entries(item.project ? PROJECT : {})) {
    mkdirSync(dirname(join(cwd, rel)), { recursive: true });
    writeFileSync(join(cwd, rel), text);
  }
  // The rules are off: they are not what is being tested and they cost tokens. The index is kept next to the project.
  const env = { ...cellEnv(), OCKHAM_RULES: 'off', OCKHAM_CANARY: canary, OCKHAM_SUBAGENT_CANARY: subCanary, OCKHAM_CACHE_DIR: join(base, 'cache') };
  const result = await runClaude({ prompt: item.prompt, cwd, arm: item.arm, model, timeoutMs: 240_000, env, tools: item.tools });
  rmSync(base, { recursive: true, force: true, maxRetries: 3 });
  const ok = result.ok && item.expect(result.reply);
  if (!ok) failed++;
  const said = result.ok ? result.reply.trim().slice(0, 80) : result.error;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${item.name}  -> ${JSON.stringify(said)}  ($${(result.costUsd ?? 0).toFixed(4)}, ${((result.wallMs ?? 0) / 1000).toFixed(0)} s)`);
}
console.log(failed ? `\n${failed} case(s) failed.` : `\nEvery hook reaches who it is for: the session, its subagents, and the session again when it writes (${model}).`);
process.exitCode = failed ? 1 : 0;
