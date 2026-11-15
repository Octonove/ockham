#!/usr/bin/env node
// UserPromptSubmit: when a request arrives, tell the agent what the project already
// has for it. This is the one moment that comes before any code is written.
// It is off as shipped (OCKHAM_HINTS=on switches it on): measured without a model, two
// in three of the things it brought up were noise. Off, it leaves at once.
import { contextOutput, readJson } from '../src/hookio.mjs';
import { hintsOn, requestContext } from '../src/project.mjs';

if (!hintsOn(process.env)) process.exit(0);
try {
  const text = requestContext(await readJson(), process.env);
  if (text) process.stdout.write(contextOutput('UserPromptSubmit', text));
} catch {
  // Fail open: a broken hook must never get in the way of the request.
}
process.exit(0);
