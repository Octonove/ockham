#!/usr/bin/env node
// What the checks at the end of a task would find, without calling any model.
//
// On every reference solution of the benchmark: is the planted problem found, and is the
// good solution left alone? With --runs, on what real sessions left behind: how many would
// have been stopped, how many of those had left the problem the check looks for, and how
// many had left nothing.
//
//   node bench/checks-check.mjs [--verbose]
//   node bench/checks-check.mjs --runs bench/runs/<stamp>,bench/runs/<stamp> | --runs all [--verbose]
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeSeed } from './lib/project.mjs';
import { passesAll } from './lib/score.mjs';
import { loadTasks } from './lib/tasks.mjs';
import { copyTree, diffTrees } from './lib/workspace.mjs';
import { CHECKS, dependencies, findings } from '../src/checks.mjs';
import { refresh } from '../src/index/store.mjs';

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const runsAt = argv.indexOf('--runs');
const all = loadTasks();
const root = mkdtempSync(join(tmpdir(), 'ockham-checks-check-'));
// Every check is looked at here, shipped on or not: this is where it is decided which ship.
const env = { OCKHAM_CACHE_DIR: join(root, 'cache'), OCKHAM_CHECKS: CHECKS.join(',') };

/** @param {string} file */
const read = (file) => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

/**
 * What the checks find in a workspace that started as `seed`.
 * @param {string} seed
 * @param {string} work
 * @param {{ prompt: string, reply?: string }} said
 */
function found(seed, work, { prompt, reply }) {
  const diff = diffTrees(seed, work);
  /** @type {Map<string, string | null>} */
  const before = new Map();
  for (const file of diff.changed) before.set(file, read(join(seed, file)));
  for (const file of diff.added) before.set(file, null);
  const { index } = refresh(work, { env, budgetMs: 10_000 });
  return findings(index, { root: work, before, deps: dependencies(read(join(seed, 'package.json'))), prompt, reply }, env);
}

// What each kind of planted problem should be found by. A reference that is wrong in a way no
// check at the end can see (code that never handled what it should) has no line here.
const FOUND_BY = { deps: 'deps', reach: 'copy' };

/** Every reference: the planted problem found, the good solution left alone. */
function checkReferences() {
  const sum = { good: 0, goodStopped: 0, planted: 0, plantedFound: 0, goodAsked: 0, needs: 0, needsAsked: 0, plain: 0, plainAsked: 0 };
  for (const task of all) {
    const seed = composeSeed(task, all.filter((other) => (other.wave ?? 1) <= (task.wave ?? 1)), join(root, 'seeds', task.id));
    /** @type {Record<string, string>} */
    const mustFail = { bad: task.badFails, ...task.refs };
    for (const ref of ['good', ...Object.keys(mustFail)]) {
      const work = join(root, 'work', `${task.id}__${ref}`);
      copyTree(seed, work);
      copyTree(join(task.dir, 'refs', ref), work);
      const checks = found(seed, work, { prompt: task.prompt }).map((finding) => finding.check);
      // Whether a reference carries a test is not what it stands for: the check about tests is counted apart.
      const others = checks.filter((check) => check !== 'test');
      const expected = ref === 'good' ? null : task.kind === 'guard' ? 'guard' : task.kind === 'reuse' ? 'twin' : FOUND_BY[/** @type {keyof typeof FOUND_BY} */ (mustFail[ref])] ?? null;
      let line = '';
      if (ref === 'good') {
        sum.good++;
        if (others.length) sum.goodStopped++;
        if (task.needsTest) sum.needs++;
        else sum.plain++;
        if (checks.includes('test') && !diffTrees(seed, work).wroteTests) {
          if (task.needsTest) sum.needsAsked++;
          else sum.plainAsked++;
        }
        line = others.length ? `STOPPED for ${others.join(', ')}` : 'left alone';
      } else if (expected) {
        sum.planted++;
        if (others.includes(expected)) sum.plantedFound++;
        line = others.includes(expected) ? `found by ${expected}` : `MISSED (looked for ${expected}; said ${others.join(', ') || 'nothing'})`;
      } else {
        line = `no check looks for this (said ${others.join(', ') || 'nothing'})`;
      }
      if (verbose || /STOPPED|MISSED/.test(line)) console.log(`${task.id} / ${ref}: ${line}${checks.includes('test') ? '  [asks for a test]' : ''}`);
    }
  }
  console.log(`\nGood solutions: ${sum.good}; stopped by a check other than the one about tests: ${sum.goodStopped}.`);
  console.log(`Planted problems a check looks for: ${sum.planted}; found: ${sum.plantedFound}.`);
  console.log(`A test is asked of a good solution that carries none: on ${sum.needsAsked} of the ${sum.needs} tasks whose logic needs one, and on ${sum.plainAsked} of the ${sum.plain} that do not.`);
}

/** Real sessions: who would have been stopped, and for what. */
function checkRuns() {
  const dirs = argv[runsAt + 1] === 'all'
    ? readdirSync(fileURLToPath(new URL('./runs/', import.meta.url)), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => fileURLToPath(new URL(`./runs/${entry.name}`, import.meta.url)))
    : argv[runsAt + 1].split(',');
  /** @type {Record<string, { had: number, hadFound: number, rest: number, restFound: number }>} */
  const tally = Object.fromEntries(CHECKS.map((check) => [check, { had: 0, hadFound: 0, rest: 0, restFound: 0 }]));
  let sessions = 0;
  let clean = 0;
  let cleanStopped = 0;
  let stopped = 0;
  // The same count arm by arm: what ships is the arm called ockham.
  /** @type {Record<string, { sessions: number, stopped: number, clean: number, cleanStopped: number, forTest: number, forRest: number }>} */
  const arms = {};
  for (const dir of dirs) {
    if (!existsSync(join(dir, 'cells.json'))) continue;
    for (const cell of JSON.parse(readFileSync(join(dir, 'cells.json'), 'utf8')).results) {
      const task = all.find((one) => one.id === cell.task);
      if (!task || !cell.score || !cell.agent?.ok || !existsSync(cell.work)) continue;
      const seed = cell.seed ?? join(task.dir, 'seed');
      const checks = found(seed, cell.work, { prompt: task.prompt, reply: cell.agent.reply }).map((finding) => finding.check);
      sessions++;
      // What each check looks for, as the hidden checks and the diff saw it.
      /** @type {Record<string, boolean>} */
      const had = {
        deps: cell.score.depsAdded.length > 0,
        twin: cell.score.reuse === false,
        copy: cell.score.reach === false,
        guard: task.kind === 'guard' && !cell.score.safe,
        test: Boolean(task.needsTest) && !cell.score.wroteTests,
        run: false,
        claim: false,                                         // no cell had a shell: nothing it says about tests having passed is true
      };
      const isClean = passesAll(cell.score) && !had.test;
      if (isClean) clean++;
      if (checks.length) stopped++;
      if (isClean && checks.length) cleanStopped++;
      const arm = (arms[cell.arm.replace(/\+(?:fulllist|facts|nohints)$/, '')] ??= { sessions: 0, stopped: 0, clean: 0, cleanStopped: 0, forTest: 0, forRest: 0 });
      arm.sessions++;
      if (checks.length) arm.stopped++;
      if (isClean) arm.clean++;
      if (isClean && checks.length) arm.cleanStopped++;
      if (checks.includes('test')) arm.forTest++;
      if (checks.some((check) => check !== 'test')) arm.forRest++;
      for (const check of CHECKS) {
        const side = had[check] ? 'had' : 'rest';
        tally[check][side]++;
        if (checks.includes(check)) {
          tally[check][`${side}Found`]++;
          if (verbose || (side === 'rest' && check !== 'claim')) console.log(`${side === 'had' ? 'found   ' : 'NOT THERE'} ${check}: ${cell.task} / ${cell.arm} #${cell.n}`);
          if (check === 'claim') console.log(`claim: ${cell.task} / ${cell.arm} #${cell.n}: ${String(cell.agent.reply).split(/\n/).find((line) => /pass|pasan|green/i.test(line))?.trim().slice(0, 200)}`);
        }
      }
    }
  }
  console.log(`\nSessions: ${sessions}; stopped by any check: ${stopped}.`);
  console.log(`Sessions that left nothing wrong (every hidden check passed, a test where the logic needs one): ${clean}; stopped all the same: ${cleanStopped}.`);
  console.log('\nArm by arm (stopped; of them for a test, for something else; sessions that left nothing wrong, and how many of those stopped):');
  for (const [name, arm] of Object.entries(arms).sort((a, b) => b[1].sessions - a[1].sessions)) {
    console.log(`  ${name.padEnd(22)} ${String(arm.sessions).padStart(4)} sessions, ${String(arm.stopped).padStart(3)} stopped (${arm.forTest} test, ${arm.forRest} other); ${String(arm.clean).padStart(4)} left nothing wrong, ${arm.cleanStopped} of them stopped`);
  }
  console.log('');
  for (const check of CHECKS) {
    const { had, hadFound, rest, restFound } = tally[check];
    console.log(`${check.padEnd(6)} what it looks for was there in ${String(had).padStart(4)} sessions, found in ${String(hadFound).padStart(4)}; it was not there in ${String(rest).padStart(4)}, and the check spoke in ${String(restFound).padStart(4)}.`);
  }
}

try {
  if (runsAt >= 0) checkRuns();
  else checkReferences();
} finally {
  rmSync(root, { recursive: true, force: true, maxRetries: 3 });
}
