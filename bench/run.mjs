#!/usr/bin/env node
// The benchmark. Every cell is one headless agent session on a fresh copy of a
// task's seed project; what it leaves behind is scored by a check it never saw.
//
//   node bench/run.mjs --selftest
//   node bench/run.mjs --arms baseline,ponytail --runs 1 --model sonnet [--tasks a,b] [--workers 3]
//   node bench/run.mjs --rescore bench/runs/<stamp>
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runClaude } from './lib/agent.mjs';
import { report } from './lib/report.mjs';
import { fails, passesAll, scoreWorkspace } from './lib/score.mjs';
import { loadTasks } from './lib/tasks.mjs';
import { copyTree } from './lib/workspace.mjs';

const RUNS_DIR = fileURLToPath(new URL('./runs/', import.meta.url));

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

/** @param {string | boolean | undefined} value */
const list = (value) => (typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);

/**
 * Every instrument must tell a good solution from a bad one before it is trusted
 * on an agent's work. No model is called here.
 */
async function selftest() {
  let failed = 0;
  for (const task of loadTasks()) {
    const seed = join(task.dir, 'seed');
    for (const ref of ['good', 'bad']) {
      const work = mkdtempSync(join(tmpdir(), `ockham-selftest-${task.id}-${ref}-`));
      copyTree(seed, work);
      copyTree(join(task.dir, 'refs', ref), work);
      const score = await scoreWorkspace(task, seed, work);
      const ok = ref === 'good' ? passesAll(score) : fails(score, task.badFails);
      if (!ok) failed++;
      const expected = ref === 'good' ? 'passes everything' : `fails "${task.badFails}"`;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${task.id} / ${ref} reference ${expected}${ok ? '' : `  -> ${JSON.stringify(score)}`}`);
    }
  }
  console.log(failed ? `\n${failed} instrument(s) cannot be trusted.` : '\nEvery instrument tells its good reference from its bad one.');
  return failed ? 1 : 0;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} workers
 * @param {(item: T) => Promise<void>} fn
 */
async function pool(items, workers, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.max(1, workers) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  }));
}

/** @param {Record<string, string | boolean>} args */
async function run(args) {
  const tasks = loadTasks(list(args.tasks));
  const arms = list(args.arms).length ? list(args.arms) : ['baseline'];
  const runs = Number(args.runs || 1);
  const model = String(args.model || 'sonnet');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
  // Workspaces live outside any git repository: inside one, the agent is shown its history.
  const workRoot = mkdtempSync(join(tmpdir(), `ockham-bench-${stamp}-`));
  const outDir = join(RUNS_DIR, stamp);
  mkdirSync(outDir, { recursive: true });

  /** @type {{ task: import('./lib/tasks.mjs').Task, arm: string, n: number }[]} */
  const cells = [];
  // Arms alternate task by task, so time of day and model drift hit them alike.
  for (let n = 1; n <= runs; n++) for (const task of tasks) for (const arm of arms) cells.push({ task, arm, n });

  /** @type {any[]} */
  const results = [];
  await pool(cells, Number(args.workers || 3), async ({ task, arm, n }) => {
    const work = join(workRoot, `${task.id}__${arm}__${n}`);
    copyTree(join(task.dir, 'seed'), work);
    const agent = await runClaude({ prompt: task.prompt, cwd: work, arm, model });
    const score = agent.ok ? await scoreWorkspace(task, join(task.dir, 'seed'), work) : null;
    results.push({ task: task.id, kind: task.kind, needsTest: task.needsTest, arm, n, work, agent, score });
    const verdict = score ? `${score.correct ? 'correct' : 'WRONG'}${score.safe ? '' : ' UNSAFE'}` : `agent failed: ${agent.error}`;
    console.log(`${task.id} / ${arm} #${n}: ${verdict}`);
  });

  const data = { stamp, model, arms, runs, workRoot, results };
  writeFileSync(join(outDir, 'cells.json'), JSON.stringify(data, null, 2));
  const text = report(data);
  writeFileSync(join(outDir, 'report.md'), text);
  console.log(`\n${text}\nSaved in ${outDir}`);
  return results.some((cell) => !cell.agent.ok) ? 1 : 0;
}

/** @param {string} dir */
async function rescore(dir) {
  const file = join(dir, 'cells.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const byId = new Map(loadTasks().map((task) => [task.id, task]));
  for (const cell of data.results) {
    const task = byId.get(cell.task);
    if (task && cell.agent.ok) cell.score = await scoreWorkspace(task, join(task.dir, 'seed'), cell.work);
  }
  writeFileSync(file, JSON.stringify(data, null, 2));
  const text = report(data);
  writeFileSync(join(dir, 'report.md'), text);
  console.log(text);
  return 0;
}

const args = parseArgs(process.argv.slice(2));
if (args.selftest) process.exitCode = await selftest();
else if (typeof args.rescore === 'string') process.exitCode = await rescore(args.rescore);
else process.exitCode = await run(args);
