#!/usr/bin/env node
// PreToolUse on Write and Edit, and on apply_patch in Codex, whose patch is looked at file by
// file as if each file were a call of Claude Code's (src/host.mjs). Two things, neither of
// which stops the change:
//   - the file is put aside as it is, the first time the task writes it, so that the checks
//     at the end can tell what the task changed;
//   - if the change defines something the project already exports from another file, or
//     replaces a line that another file has too, the agent is told. It may be right.
import { contextOutput, readJson } from '../src/hookio.mjs';
import { fileWrites } from '../src/host.mjs';
import { writeContext } from '../src/project.mjs';
import { taskWrites } from '../src/task.mjs';

/** @type {string[]} */
const said = [];
for (const input of fileWrites(await readJson())) {
  try {
    taskWrites(input, process.env);
  } catch {
    // Fail open: a task whose files were not put aside is simply not checked at the end.
  }
  try {
    // A file that goes is only put aside: there is nothing in it to look up.
    const text = input.tool_name === 'Delete' ? '' : writeContext(input, process.env);
    if (text) said.push(text);
  } catch {
    // Fail open: a broken hook must never get in the way of the change.
  }
}
if (said.length) process.stdout.write(contextOutput('PreToolUse', said.join('\n\n')));
process.exit(0);
