// What Ockham did, one line at a time, and what each session has already been told.
// The journal is what the accounts of a later phase are made from, and what the
// benchmark reads to know which sessions got a hint. Nothing here may stop a hook:
// every failure is swallowed.
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { cacheDir } from './index/store.mjs';

const MAX_JOURNAL_BYTES = 5_000_000;

/** @param {Record<string, string | undefined>} [env] */
export const journalPath = (env = process.env) => join(cacheDir(env), 'journal.jsonl');

/**
 * @param {Record<string, any>} event  at least { event, root }
 * @param {Record<string, string | undefined>} [env]
 */
export function record(event, env = process.env) {
  try {
    const file = journalPath(env);
    mkdirSync(cacheDir(env), { recursive: true });
    try {
      // One generation is kept: the journal starts again when it has grown large.
      if (statSync(file).size > MAX_JOURNAL_BYTES) renameSync(file, `${file}.old`);
    } catch {
      // no journal yet
    }
    appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
  } catch {
    // a journal that cannot be written is not a reason to say nothing to the agent
  }
}

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {Record<string, any>[]}
 */
export function readJournal(env = process.env) {
  try {
    return readFileSync(journalPath(env), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * @param {string | undefined} sessionId
 * @param {Record<string, string | undefined>} env
 */
function sessionFile(sessionId, env) {
  const id = /^[A-Za-z0-9_-]{1,80}$/.test(String(sessionId)) ? String(sessionId) : 'unknown';
  return join(cacheDir(env), 'sessions', `${id}.json`);
}

/**
 * What a session has been told so far, so that nothing is said to it twice.
 * @param {string | undefined} sessionId
 * @param {Record<string, string | undefined>} [env]
 * @returns {Set<string>}
 */
export function told(sessionId, env = process.env) {
  try {
    return new Set(JSON.parse(readFileSync(sessionFile(sessionId, env), 'utf8')));
  } catch {
    return new Set();
  }
}

/**
 * @param {string | undefined} sessionId
 * @param {Iterable<string>} keys
 * @param {Record<string, string | undefined>} [env]
 */
export function tell(sessionId, keys, env = process.env) {
  try {
    const file = sessionFile(sessionId, env);
    mkdirSync(join(cacheDir(env), 'sessions'), { recursive: true });
    writeFileSync(file, JSON.stringify([...new Set([...told(sessionId, env), ...keys])]));
  } catch {
    // saying something twice is the worst that can come of this
  }
}
