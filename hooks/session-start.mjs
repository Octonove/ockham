#!/usr/bin/env node
// SessionStart: hands the session Ockham's rules and what the project already has.
// It does not wait for stdin: nothing it says depends on the hook's input, and some
// hosts never close it. The project is the folder the host names in the environment.
import { contextOutput } from '../src/hookio.mjs';
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
// Until the user chooses, every session tells them that the part about tests is off and how
// to choose: in a notice for the user, which the model never sees.
let notice = '';
try {
  notice = testsNotice(process.env);
} catch {
  // Fail open: no notice is better than no session.
}
const text = parts.filter(Boolean).join('\n\n');
if (text || notice) process.stdout.write(contextOutput('SessionStart', text, notice));
process.exit(0);
