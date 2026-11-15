#!/usr/bin/env node
// PostToolUse on Bash: notes that the session has a shell and, if the command ran the
// tests, that the task has been tested as of now. It says nothing to the agent.
import { readJson } from '../src/hookio.mjs';
import { taskRuns } from '../src/task.mjs';

try {
  taskRuns(await readJson(), process.env);
} catch {
  // Fail open: a broken hook must never get in the way of a command.
}
process.exit(0);
