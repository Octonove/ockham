#!/usr/bin/env node
// Stop: when the agent means to finish, one look at what the task leaves behind. If the
// look finds something, the agent is told and goes on; it is told once, and the second time
// it means to stop, it stops. This is the only hook of Ockham's that interrupts.
import { readJson } from '../src/hookio.mjs';
import { taskEnds } from '../src/task.mjs';

try {
  const reason = taskEnds(await readJson(), process.env);
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
} catch {
  // Fail open: a broken hook must never keep an agent from finishing.
}
process.exit(0);
