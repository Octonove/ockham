#!/usr/bin/env node
// SessionStart: hands Ockham's text to the session. It does not wait for stdin:
// nothing it says depends on the hook's input, and some hosts never close it.
import { contextOutput } from '../src/hookio.mjs';
import { sessionContext } from '../src/session.mjs';

try {
  const text = sessionContext(process.env);
  if (text) process.stdout.write(contextOutput('SessionStart', text));
} catch {
  // Fail open: a broken hook must never get in the way of the session.
}
process.exit(0);
