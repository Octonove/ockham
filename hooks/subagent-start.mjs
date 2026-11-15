#!/usr/bin/env node
// SubagentStart: what a session is told when it starts never reaches the agents it
// hands work to, so each of them is given the compact rules as it starts.
// Like the session hook, it does not wait for stdin.
import { contextOutput } from '../src/hookio.mjs';
import { subagentContext } from '../src/session.mjs';

try {
  const text = subagentContext(process.env);
  if (text) process.stdout.write(contextOutput('SubagentStart', text));
} catch {
  // Fail open: a broken hook must never get in the way of the subagent.
}
process.exit(0);
