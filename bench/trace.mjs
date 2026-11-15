#!/usr/bin/env node
// Runs one cell of the benchmark and prints what the agent did, call by call.
// A benchmark run keeps no transcript, only what each session left behind and its last
// message. When a rule is not followed, this is how to see why: which searches the agent
// ran, which files it opened, and whether its closing message matches what it did.
// It starts a real session, so it spends a little quota.
//
//   node bench/trace.mjs <task> [arm] [--model sonnet]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { armEnv, cellArgs, cellEnv, findClaude } from './lib/agent.mjs';
import { composeSeed } from './lib/project.mjs';
import { loadTasks } from './lib/tasks.mjs';
import { copyTree } from './lib/workspace.mjs';

const argv = process.argv.slice(2);
const at = argv.indexOf('--model');
const model = at >= 0 ? argv.splice(at, 2)[1] : 'sonnet';
const [taskId, arm = 'ockham'] = argv;

const all = loadTasks();
const task = all.find((one) => one.id === taskId);
if (!task) {
  console.error(`Unknown task: ${taskId}. Usage: node bench/trace.mjs <task> [arm] [--model sonnet]`);
  process.exit(1);
}
const root = mkdtempSync(join(tmpdir(), 'ockham-trace-'));
// The same project a run gives this task: its own round of tasks and the earlier ones.
const seed = composeSeed(task, all.filter((other) => (other.wave ?? 1) <= (task.wave ?? 1)), join(root, 'seed'));
const work = join(root, 'work');
copyTree(seed, work);

/** @param {unknown} value */
const short = (value, length = 240) => JSON.stringify(value).split(work).join('.').slice(0, length);

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
      if (block.type === 'tool_use') console.log(`TOOL  ${block.name} ${short(block.input)}`);
      if (block.type === 'text' && event.type === 'assistant') console.log(`SAYS  ${block.text.trim()}`);
    }
    if (event.type === 'result') console.log(`END   ${event.num_turns} turns, $${Number(event.total_cost_usd ?? 0).toFixed(4)}`);
  }
});
child.on('close', () => console.log(`The workspace is kept in ${work}`));
child.stdin.end(task.prompt);
