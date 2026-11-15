#!/usr/bin/env node
// PreToolUse on Write and Edit: if the change defines something the project already
// exports from another file, or replaces a line that another file has too, say so.
// It never stops the change: the agent may be right.
import { contextOutput, readJson } from '../src/hookio.mjs';
import { writeContext } from '../src/project.mjs';

try {
  const text = writeContext(await readJson(), process.env);
  if (text) process.stdout.write(contextOutput('PreToolUse', text));
} catch {
  // Fail open: a broken hook must never get in the way of the change.
}
process.exit(0);
