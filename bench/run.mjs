#!/usr/bin/env node
// The benchmark. Every cell is one headless agent session on a fresh copy of the
// project a task starts from; what it leaves behind is scored by a check it never saw.
//
//   node bench/run.mjs --selftest
//   node bench/run.mjs --arms baseline,ponytail --runs 1 --model sonnet [--tasks a,b] [--workers 3] [--max-usd 1.5] [--alone]
//   node bench/run.mjs --rescore bench/runs/<stamp>
//   node bench/run.mjs --combine bench/runs/<stamp>,bench/runs/<stamp> [--out file.md]
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { armEnv, cellEnv, runClaude } from './lib/agent.mjs';
import { composeSeed } from './lib/project.mjs';
import { report } from './lib/report.mjs';
import { fails, passesAll, scoreWorkspace } from './lib/score.mjs';
import { loadTasks } from './lib/tasks.mjs';
import { hushStatusLineNote, restoreTraces, snapshotTraces } from './lib/traces.mjs';
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
 * Where a task's cells start from: its seed inside the whole project, or, with
 * --alone, the seed and nothing around it.
 * @param {import('./lib/tasks.mjs').Task} task
 * @param {import('./lib/tasks.mjs').Task[]} all
 * @param {string} root
 * @param {boolean} alone
 */
function seedFor(task, all, root, alone) {
  return alone ? join(task.dir, 'seed') : composeSeed(task, all, join(root, '_seeds', task.id));
}

/**
 * Every instrument must tell a good solution from a bad one before it is trusted
 * on an agent's work, both inside the project and on the bare seed. No model is called here.
 */
async function selftest() {
  const all = loadTasks();
  const root = mkdtempSync(join(tmpdir(), 'ockham-selftest-'));
  let failed = 0;
  for (const alone of [false, true]) {
    const where = alone ? 'alone' : 'project';
    console.log(alone ? '\nEach seed on its own' : 'Each task inside the whole project');
    for (const task of all) {
      const seed = seedFor(task, all, join(root, where), alone);
      // The good reference must pass everything; every other one must fail the field it stands for.
      const mustFail = { bad: task.badFails, ...task.refs };
      for (const ref of ['good', ...Object.keys(mustFail)]) {
        const work = join(root, where, `${task.id}__${ref}`);
        copyTree(seed, work);
        copyTree(join(task.dir, 'refs', ref), work);
        const score = await scoreWorkspace(task, seed, work);
        const ok = ref === 'good' ? passesAll(score) : fails(score, mustFail[ref]);
        if (!ok) failed++;
        const expected = ref === 'good' ? 'passes everything' : `fails "${mustFail[ref]}"`;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${task.id} / ${ref} reference ${expected}${ok ? '' : `  -> ${JSON.stringify(score)}`}`);
      }
    }
  }
  console.log(failed ? `\n${failed} instrument(s) cannot be trusted.` : '\nEvery instrument tells its good reference from its bad ones.');
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
  const all = loadTasks();
  const tasks = loadTasks(list(args.tasks));
  const arms = list(args.arms).length ? list(args.arms) : ['baseline'];
  const runs = Number(args.runs || 1);
  const model = String(args.model || 'sonnet');
  const alone = Boolean(args.alone);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
  // Workspaces live outside any git repository: inside one, the agent is shown its history.
  const workRoot = mkdtempSync(join(tmpdir(), `ockham-bench-${stamp}-`));
  const outDir = join(RUNS_DIR, stamp);
  mkdirSync(outDir, { recursive: true });
  const seeds = new Map(tasks.map((task) => [task.id, seedFor(task, all, workRoot, alone)]));

  /** @type {{ task: import('./lib/tasks.mjs').Task, arm: string, n: number }[]} */
  const cells = [];
  // Arms alternate task by task, so time of day and model drift hit them alike.
  for (let n = 1; n <= runs; n++) for (const task of tasks) for (const arm of arms) cells.push({ task, arm, n });

  /** @type {any[]} */
  const results = [];
  const maxUsd = Number(args['max-usd'] || 1.5);
  const traces = arms.includes('ponytail') ? snapshotTraces() : null;
  if (traces) hushStatusLineNote(traces);
  try {
    await pool(cells, Number(args.workers || 3), async ({ task, arm, n }) => {
      const seed = String(seeds.get(task.id));
      const work = join(workRoot, `${task.id}__${arm}__${n}`);
      copyTree(seed, work);
      const agent = await runClaude({ prompt: task.prompt, cwd: work, arm, model, maxUsd, env: { ...cellEnv(), ...armEnv(arm, workRoot) } });
      const score = agent.ok ? await scoreWorkspace(task, seed, work) : null;
      results.push({ task: task.id, kind: task.kind, needsTest: task.needsTest, arm, n, seed, work, agent, score });
      // Saved after every cell: a run that is cut short keeps the sessions it paid for.
      writeFileSync(join(outDir, 'cells.json'), JSON.stringify({ stamp, model, arms, runs, alone, workRoot, unfinished: true, results }, null, 2));
      const verdict = score ? `${score.correct ? 'correct' : 'WRONG'}${score.safe ? '' : ' (broke on input the ticket left out)'}` : `agent failed: ${agent.error}`;
      console.log(`${task.id} / ${arm} #${n}: ${verdict}`);
    });
  } finally {
    const removed = traces ? restoreTraces(traces) : [];
    if (removed.length) console.log(`Removed what the reference arm left in ${traces?.claudeDir}: ${removed.join(', ')}`);
  }

  // Cells finish in any order; the files keep the order they were planned in.
  const order = new Map(cells.map((cell, index) => [`${cell.task.id}|${cell.arm}|${cell.n}`, index]));
  results.sort((a, b) => (order.get(`${a.task}|${a.arm}|${a.n}`) ?? 0) - (order.get(`${b.task}|${b.arm}|${b.n}`) ?? 0));
  const data = { stamp, model, arms, runs, alone, workRoot, results };
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
    // Runs made before tasks ran inside the project did not record where they started from.
    if (task && cell.agent.ok) cell.score = await scoreWorkspace(task, cell.seed ?? join(task.dir, 'seed'), cell.work);
  }
  writeFileSync(file, JSON.stringify(data, null, 2));
  const text = report(data);
  writeFileSync(join(dir, 'report.md'), text);
  console.log(text);
  return 0;
}

/**
 * One report over several runs of the same arms, so sessions already paid for count.
 * @param {string[]} dirs
 * @param {string | boolean | undefined} out
 */
function combine(dirs, out) {
  const parts = dirs.map((dir) => JSON.parse(readFileSync(join(dir, 'cells.json'), 'utf8')));
  const [first] = parts;
  for (const part of parts) {
    const same = part.model === first.model && String(part.arms) === String(first.arms) && Boolean(part.alone) === Boolean(first.alone);
    if (!same) throw new Error(`Run ${part.stamp} used another model, other arms or another project than ${first.stamp}: they cannot be added up.`);
  }
  /** @type {any[]} */
  const results = [];
  let before = 0;
  for (const part of parts) {
    for (const cell of part.results) results.push({ ...cell, n: cell.n + before });
    before += part.runs;
  }
  const text = report({ ...first, stamp: parts.map((part) => part.stamp).join(' + '), runs: before, results });
  if (typeof out === 'string') writeFileSync(out, text);
  console.log(text);
  return 0;
}

const args = parseArgs(process.argv.slice(2));
if (args.selftest) process.exitCode = await selftest();
else if (typeof args.rescore === 'string') process.exitCode = await rescore(args.rescore);
else if (typeof args.combine === 'string') process.exitCode = combine(list(args.combine), args.out);
else process.exitCode = await run(args);
