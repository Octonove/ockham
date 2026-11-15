#!/usr/bin/env node
// PreToolUse on Write and Edit. Two things, neither of which stops the change:
//   - the file is put aside as it is, the first time the task writes it, so that the checks
//     at the end can tell what the task changed;
//   - if the change defines something the project already exports from another file, or
//     replaces a line that another file has too, the agent is told. It may be right.
import { contextOutput, readJson } from '../src/hookio.mjs';
import { writeContext } from '../src/project.mjs';
import { taskWrites } from '../src/task.mjs';

const input = await readJson();
try {
  taskWrites(input, process.env);
} catch {
  // Fail open: a task whose files were not put aside is simply not checked at the end.
}
try {
  const text = writeContext(input, process.env);
  if (text) process.stdout.write(contextOutput('PreToolUse', text));
} catch {
  // Fail open: a broken hook must never get in the way of the change.
}
process.exit(0);
