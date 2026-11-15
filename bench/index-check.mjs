#!/usr/bin/env node
// What the index would say on every task of the benchmark, without calling any model.
//
// For each task, in the project a run would give it:
//   - is the helper it should reuse among what a session is told at the start?
//   - what does the request bring up, and how much of it is where the good solution
//     works: the files it changes that the request does not name, and the helper?
//   - does any reference solution get the warning about a second copy?
//   - is a change that fixes one place of two told where the other one is?
// With --runs it puts the last two questions to what real sessions left behind.
//
//   node bench/index-check.mjs [--verbose]
//   node bench/index-check.mjs --runs bench/runs/<stamp>,bench/runs/<stamp> [--verbose]
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';

import { composeSeed } from './lib/project.mjs';
import { loadTasks } from './lib/tasks.mjs';
import { copyTree, diffTrees } from './lib/workspace.mjs';
import { copiesOf } from '../src/index/copies.mjs';
import { definitionsIn, digest, hintsFor, twinsOf } from '../src/index/lookup.mjs';
import { isTest, SOURCE } from '../src/index/scan.mjs';
import { refresh } from '../src/index/store.mjs';

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const runsAt = argv.indexOf('--runs');
const all = loadTasks();
const root = mkdtempSync(join(tmpdir(), 'ockham-index-check-'));
const env = { OCKHAM_CACHE_DIR: join(root, 'cache') };

/**
 * The helper a reuse task is about: where it lives and what it is called, read off the
 * patterns that prove it was used.
 * @param {import('./lib/tasks.mjs').Task} task
 */
function helperOf(task) {
  if (!task.reuse) return null;
  const text = task.reuse.patterns.join(' ').replace(/\\/g, '');
  const spec = text.match(/(\.\.?\/[\w./-]+)/)?.[1];
  const name = text.match(/([A-Za-z_$][\w$]*)\(/)?.[1];
  return spec && name ? { file: posix.normalize(posix.join(posix.dirname(task.reuse.file), spec)), name } : null;
}

/** @param {string} seedDir @param {string} workDir */
function sourceTouched(seedDir, workDir) {
  const diff = diffTrees(seedDir, workDir);
  return [...diff.added, ...diff.changed].filter((file) => SOURCE.test(file) && !isTest(file) && existsSync(join(workDir, file)));
}

/**
 * The warnings a change would get: for every source file it adds or changes, what is
 * newly defined there and already exported somewhere else.
 * @param {import('../src/index/store.mjs').Index} index
 * @param {string} seedDir
 * @param {string} workDir
 */
function warnings(index, seedDir, workDir) {
  const out = [];
  for (const file of sourceTouched(seedDir, workDir)) {
    const had = new Set((index.files[file]?.symbols ?? []).map((symbol) => symbol.name));
    const fresh = definitionsIn(readFileSync(join(workDir, file), 'utf8')).filter((definition) => !had.has(definition.name));
    for (const { name, twin } of twinsOf(index, file, fresh)) out.push(`${name} ~ ${twin.file}#${twin.name}`);
  }
  return out;
}

/**
 * The other places a change would be pointed to: for every source file it changes, where
 * else the project has what was replaced there. Places in files the change itself also
 * edits are left out: those it found without help.
 * @param {import('../src/index/store.mjs').Index} index
 * @param {string} seedDir
 * @param {string} workDir
 * @returns {string[]}
 */
function pointedTo(index, seedDir, workDir) {
  const touched = sourceTouched(seedDir, workDir);
  /** @type {Set<string>} */
  const out = new Set();
  for (const file of touched) {
    if (!existsSync(join(seedDir, file))) continue;
    const places = copiesOf(index, seedDir, file, readFileSync(join(seedDir, file), 'utf8'), readFileSync(join(workDir, file), 'utf8'));
    for (const place of places) if (!touched.includes(place.file)) out.add(`${place.file}:${place.line}`);
  }
  return [...out];
}

/** @param {import('./lib/tasks.mjs').Task} task */
function projectOf(task) {
  const seed = composeSeed(task, all.filter((other) => (other.wave ?? 1) <= (task.wave ?? 1)), join(root, 'seeds', task.id));
  const started = Date.now();
  const { index } = refresh(seed, { env, budgetMs: 10_000 });
  return { seed, index, ms: Date.now() - started };
}

/** Real sessions: would the warning have fired, and was it right to? */
function checkRuns() {
  const tally = { wroteOwn: 0, wroteOwnWarned: 0, reused: 0, reusedWarned: 0, other: 0, otherWarned: 0, missed: 0, missedPointed: 0, rest: 0, restPointed: 0 };
  /** @type {Map<string, ReturnType<typeof projectOf>>} */
  const projects = new Map();
  for (const dir of argv[runsAt + 1].split(',')) {
    for (const cell of JSON.parse(readFileSync(join(dir, 'cells.json'), 'utf8')).results) {
      const task = all.find((one) => one.id === cell.task);
      if (!task || !cell.score || !existsSync(cell.work)) continue;
      if (!projects.has(task.id)) projects.set(task.id, projectOf(task));
      const { seed, index } = /** @type {ReturnType<typeof projectOf>} */ (projects.get(task.id));
      const fired = warnings(index, seed, cell.work);
      const group = cell.score.reuse === false ? 'wroteOwn' : cell.score.reuse === true ? 'reused' : 'other';
      tally[group]++;
      if (fired.length) {
        tally[`${group}Warned`]++;
        if (verbose || group !== 'wroteOwn') console.log(`${group.padEnd(8)} ${cell.task} / ${cell.arm} #${cell.n}: ${fired.join('; ')}`);
      }
      // A place the session left alone and would have been pointed to.
      const places = pointedTo(index, seed, cell.work);
      const left = cell.score.reach === false ? 'missed' : 'rest';
      tally[left]++;
      if (places.length) {
        tally[`${left}Pointed`]++;
        if (verbose || left === 'rest') console.log(`${left === 'missed' ? 'missed  ' : 'NOT missed'} ${cell.task} / ${cell.arm} #${cell.n}: would be pointed to ${places.join(', ')}`);
      }
    }
  }
  console.log(`\nSessions that fixed one place and left another: ${tally.missed}; they would have been pointed to a place they left in ${tally.missedPointed}.`);
  console.log(`All the other sessions: ${tally.rest}; pointed to a place they did not touch: ${tally.restPointed}.`);
  console.log(`\nSessions that wrote their own version of a helper: ${tally.wroteOwn}; the warning would have fired in ${tally.wroteOwnWarned}.`);
  console.log(`Sessions that reused the helper: ${tally.reused}; warned all the same: ${tally.reusedWarned}.`);
  console.log(`Sessions on tasks with no helper to reuse: ${tally.other}; warned: ${tally.otherWarned}.`);
}

/** Every task: the list at the start, what the request brings up, the warning on its references. */
function checkTasks() {
  const sum = { helpers: 0, listed: 0, helperHinted: 0, hints: 0, useful: 0, unsaid: 0, unsaidHinted: 0, quiet: 0, warnedGood: 0, warnedOther: 0, slowest: 0, oneOfTwo: 0, oneOfTwoPointed: 0, goodPointed: 0 };
  for (const task of all) {
    const { seed, index, ms } = projectOf(task);
    sum.slowest = Math.max(sum.slowest, ms);
    const helper = helperOf(task);
    const shared = digest(index);
    const hints = hintsFor(index, task.prompt);
    const has = (/** @type {import('../src/index/lookup.mjs').Found[]} */ list) => Boolean(helper && list.some((found) => found.file === helper.file && found.name === helper.name));

    /** @type {Record<string, string[]>} */
    const refs = {};
    /** @type {Record<string, string[]>} */
    const pointed = {};
    /** @type {string[]} */
    let touched = [];
    for (const ref of ['good', 'bad', ...Object.keys(task.refs ?? {})]) {
      const work = join(root, 'refs', `${task.id}__${ref}`);
      copyTree(seed, work);
      copyTree(join(task.dir, 'refs', ref), work);
      refs[ref] = warnings(index, seed, work);
      pointed[ref] = pointedTo(index, seed, work);
      if (ref === 'good') touched = sourceTouched(seed, work);
    }
    // A reference that must fail "reach" fixes one place and leaves the other: is it told where that is?
    for (const [ref, field] of Object.entries({ bad: task.badFails, ...task.refs })) {
      if (field !== 'reach') continue;
      sum.oneOfTwo++;
      if (pointed[ref].some((place) => touched.includes(place.split(':')[0]))) sum.oneOfTwoPointed++;
    }
    sum.goodPointed += pointed.good.length;
    // Where the good solution works and the request does not say: the other place of a bug, the helper.
    const unsaid = [...new Set([...touched, ...(helper ? [helper.file] : [])])].filter((file) => !task.prompt.includes(file));
    const hinted = new Set(hints.map((found) => found.file));
    const useful = hints.filter((found) => touched.includes(found.file) || found.file === helper?.file);

    if (helper) {
      sum.helpers++;
      if (has(shared)) sum.listed++;
      if (has(hints)) sum.helperHinted++;
    }
    sum.hints += hints.length;
    sum.useful += useful.length;
    sum.unsaid += unsaid.length;
    sum.unsaidHinted += unsaid.filter((file) => hinted.has(file)).length;
    if (!hints.length) sum.quiet++;
    sum.warnedGood += refs.good.length;
    sum.warnedOther += Object.entries(refs).filter(([ref, fired]) => ref !== 'good' && fired.length).length;

    const state = helper ? `helper ${helper.name}: ${has(shared) ? 'in the list at the start' : 'NOT in the list'}, ${has(hints) ? 'brought up by the request' : 'not brought up'}` : '';
    console.log(`${task.id.padEnd(20)} ${hints.length} brought up, ${useful.length} of them where the good solution works; ${unsaid.filter((file) => hinted.has(file)).length}/${unsaid.length} of the places the request does not name. ${state}`);
    if (verbose) {
      console.log(`    request brings up: ${hints.map((found) => `${found.name} (${found.file}, ${found.score.toFixed(1)}: ${found.matched.join(' ')})`).join('; ') || 'nothing'}`);
      if (unsaid.length) console.log(`    places not named: ${unsaid.join(', ')}`);
    }
    for (const [ref, fired] of Object.entries(refs)) if (fired.length) console.log(`    ${ref} reference would be warned: ${fired.join('; ')}`);
    for (const [ref, places] of Object.entries(pointed)) if (places.length) console.log(`    ${ref} reference would be pointed to ${places.join(', ')}`);
  }
  const sample = projectOf(all[0]);
  const symbols = Object.values(sample.index.files).flatMap((entry) => entry.symbols);
  console.log(`\nThe project of ${all[0].id}: ${Object.keys(sample.index.files).length} files, ${symbols.length} symbols, ${symbols.filter((symbol) => symbol.exported).length} exported; ${digest(sample.index).length} listed at the start. Slowest first build: ${sum.slowest} ms.`);
  console.log(`Helper told at the start: ${sum.listed}/${sum.helpers}. Helper brought up by the request: ${sum.helperHinted}/${sum.helpers}.`);
  console.log(`Requests: ${sum.hints} symbols brought up over ${all.length} tasks (${sum.quiet} tasks with none); ${sum.useful} of them where the good solution works.`);
  console.log(`Places the good solution works in that the request does not name: ${sum.unsaidHinted}/${sum.unsaid} brought up.`);
  console.log(`Good references warned about a second copy: ${sum.warnedGood}. Other references warned: ${sum.warnedOther}.`);
  console.log(`References that fix one place of two: ${sum.oneOfTwoPointed}/${sum.oneOfTwo} pointed to the other. Good references pointed to a place they do not touch: ${sum.goodPointed}.`);
}

try {
  if (runsAt >= 0) checkRuns();
  else checkTasks();
} finally {
  rmSync(root, { recursive: true, force: true, maxRetries: 3 });
}
