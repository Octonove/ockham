#!/usr/bin/env node
// Runs one cell of the benchmark and prints what the agent did, call by call, and then
// what the hidden check made of the result.
// A benchmark run keeps no transcript, only what each session left behind and its last
// message. When a rule is not followed, this is how to see why: which searches the agent
// ran, which files it opened, and whether its closing message matches what it did.
// It starts a real session, so it spends a little quota.
//
//   node bench/trace.mjs <task> [arm] [--model sonnet] [--save recording.json]
//
// --save keeps the whole trace as JSON. The demo in the README is drawn from such files.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { armEnv, cellArgs, cellEnv, findClaude, ockhamCache } from './lib/agent.mjs';
import { composeSeed } from './lib/project.mjs';
import { scoreWorkspace } from './lib/score.mjs';
import { loadTasks } from './lib/tasks.mjs';
import { copyTree } from './lib/workspace.mjs';
import { readJournal } from '../src/journal.mjs';

const argv = process.argv.slice(2);
/** @param {string} name */
const option = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : undefined;
};
const model = option('--model') ?? 'sonnet';
const save = option('--save');
const [taskId, arm = 'ockham'] = argv;

const all = loadTasks();
const task = all.find((one) => one.id === taskId);
if (!task) {
  console.error(`Unknown task: ${taskId}. Usage: node bench/trace.mjs <task> [arm] [--model sonnet] [--save recording.json]`);
  process.exit(1);
}
const root = mkdtempSync(join(tmpdir(), 'ockham-trace-'));
// The same project a run gives this task: its own round of tasks and the earlier ones.
const seed = composeSeed(task, all.filter((other) => (other.wave ?? 1) <= (task.wave ?? 1)), join(root, 'seed'));
const work = join(root, 'work');
copyTree(seed, work);

/**
 * A tool call's input with the paths that point into the workspace written from its
 * root, the way the project itself would write them.
 * @param {Record<string, any>} input
 */
function local(input) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    const inside = typeof value === 'string' && value.toLowerCase().startsWith(work.toLowerCase());
    out[key] = inside ? value.slice(work.length + 1).replace(/\\/g, '/') || '.' : value;
  }
  return out;
}

/** @type {Record<string, any>[]} */
const events = [];
// A cell as a run starts it, except that the session reports every step instead of only its end.
const args = [...cellArgs(arm, model).map((arg) => (arg === 'json' ? 'stream-json' : arg)), '--verbose'];
const child = spawn(findClaude(), args, { cwd: work, env: { ...cellEnv(), ...armEnv(arm, root) }, stdio: ['pipe', 'pipe', 'inherit'] });
let pending = '';
child.stdout.on('data', (chunk) => {
  pending += chunk;
  for (let end = pending.indexOf('\n'); end >= 0; end = pending.indexOf('\n')) {
    const line = pending.slice(0, end);
    pending = pending.slice(end + 1);
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use') {
        events.push({ type: 'tool', at: Date.now(), name: block.name, input: local(block.input) });
        console.log(`TOOL  ${block.name} ${JSON.stringify(local(block.input)).slice(0, 240)}`);
      }
      if (block.type === 'text' && event.type === 'assistant') {
        events.push({ type: 'says', at: Date.now(), text: block.text.trim() });
        console.log(`SAYS  ${block.text.trim()}`);
      }
    }
    if (event.type === 'result') {
      events.push({ type: 'end', at: Date.now(), turns: event.num_turns, costUsd: Number(event.total_cost_usd ?? 0), seconds: Number(event.duration_ms ?? 0) / 1000 });
      console.log(`END   ${event.num_turns} turns, $${Number(event.total_cost_usd ?? 0).toFixed(4)}`);
    }
  }
});
child.on('close', async () => {
  // What Ockham's hooks told the session is in its journal. Each entry goes where it
  // happened: a note about an edit comes right after that edit.
  // What each check at the end is about, in a few words.
  /** @type {Record<string, string>} */
  const FOUND = { deps: 'package.json has a new dependency', twin: 'this defines what the project already has', copy: 'what you replaced is still in another file',
    guard: 'a check this code made is gone', test: 'no test was added or changed', run: 'the tests have not been run', claim: 'the summary says the tests pass and none ran' };
  for (const said of readJournal({ OCKHAM_CACHE_DIR: ockhamCache(root) })) {
    // Each is what the hook said, cut down to a line: the session got the whole text.
    const text = said.event === 'shared' ? `here are the ${said.helpers} helpers this project shares${said.tests ? ', and where its tests are' : ''}`
      : said.event === 'copy' ? `what this change replaces is also in ${said.places.join(', ')}`
        : said.event === 'twin' ? `this change defines ${said.name}, and the project already has ${said.twin.replace('#', ': ')}`
          : said.event === 'hint' ? `for this request the project already has ${said.symbols.map((/** @type {string} */ symbol) => symbol.split('#')[1]).join(', ')}`
            : said.event === 'check' ? `before you finish: ${said.checks.map((/** @type {string} */ check) => FOUND[check] ?? check).join('; ')}`
              : said.event === 'checked' ? (said.left.length ? `it stopped with this still there: ${said.left.map((/** @type {string} */ check) => FOUND[check] ?? check).join('; ')}` : 'it dealt with all of it, and stopped') : null;
    if (!text) continue;
    events.push({ type: 'ockham', at: Date.parse(said.at), event: said.event, text });
    console.log(`OCKHAM ${text}`);
  }
  events.sort((a, b) => a.at - b.at);
  const score = await scoreWorkspace(task, seed, work);
  const wrong = [!score.correct && 'not correct', !score.safe && 'breaks on input the ticket left out', score.reach === false && 'missed a place', score.reuse === false && 'did not reuse',
    score.depsAdded.length && `added ${score.depsAdded.join(', ')}`, score.lean === false && 'over the size budget'].filter(Boolean);
  console.log(`CHECK ${wrong.length ? wrong.join('; ') : 'passes every hidden check'}. ${score.notes}`);
  console.log(`      ${score.sourceLinesAdded} source line(s) added${score.wroteTests ? ', and a test' : ', no test'}.`);
  if (save) {
    writeFileSync(save, `${JSON.stringify({ task: task.id, title: task.title, prompt: task.prompt, arm, model, events, score }, null, 2)}\n`);
    console.log(`Saved in ${save}`);
  }
  console.log(`The workspace is kept in ${work}`);
});
child.stdin.end(task.prompt);
