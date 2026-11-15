#!/usr/bin/env node
// UserPromptSubmit: a request arrives, and a task starts. Two things:
//   - the task's ledger is opened, for the checks at the end;
//   - the agent is told what the project already has for the request. This is off as shipped
//     (OCKHAM_HINTS=on switches it on): measured without a model, two in three of the things
//     it brought up were noise.
// With both off it leaves at once, without reading its input.
import { checksOn } from '../src/checks.mjs';
import { contextOutput, readJson } from '../src/hookio.mjs';
import { hintsOn, requestContext } from '../src/project.mjs';
import { taskStarts } from '../src/task.mjs';

const checks = checksOn(process.env).length > 0;
if (!checks && !hintsOn(process.env)) process.exit(0);
const input = await readJson();
try {
  if (checks) taskStarts(input, process.env);
} catch {
  // Fail open: a task without a ledger is simply not checked at the end.
}
try {
  const text = hintsOn(process.env) ? requestContext(input, process.env) : '';
  if (text) process.stdout.write(contextOutput('UserPromptSubmit', text));
} catch {
  // Fail open: a broken hook must never get in the way of the request.
}
process.exit(0);
