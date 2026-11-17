#!/usr/bin/env node
// SessionStart: hands the session Ockham's rules and what the project already has.
// It does not wait for stdin: nothing it says depends on the hook's input, and some
// hosts never close it. The project is the folder the host names in the environment.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { contextOutput } from '../src/hookio.mjs';
import { cacheDir } from '../src/index/store.mjs';
import { sharedContext } from '../src/project.mjs';
import { sessionContext, testsNotice } from '../src/session.mjs';

/** @type {string[]} */
const parts = [];
try {
  parts.push(sessionContext(process.env));
} catch {
  // Fail open: a broken hook must never get in the way of the session.
}
try {
  parts.push(sharedContext({}, process.env));
} catch {
  // The rules still go out if the index cannot be built.
}
// The user is told once on each machine that the part about tests is off and what it gives:
// the first session that leaves the mark is the one that says it.
let notice = '';
try {
  notice = testsNotice(process.env);
  if (notice) {
    mkdirSync(cacheDir(process.env), { recursive: true });
    writeFileSync(join(cacheDir(process.env), 'tests-notice'), new Date().toISOString(), { flag: 'wx' });
  }
} catch {
  notice = '';
}
const text = parts.filter(Boolean).join('\n\n');
if (text || notice) process.stdout.write(contextOutput('SessionStart', text, notice));
process.exit(0);
