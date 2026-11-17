// Claude Code and Codex call the same hooks with nearly the same input (D22). Two differences
// matter to Ockham. Codex names a request by its turn_id, where Claude Code sends a prompt_id.
// And Codex writes files with apply_patch, one patch for any number of files, where Claude Code
// sends Write, Edit or MultiEdit for one file. Each patch is turned here into the calls Claude
// Code would have made, file by file, so that the rest of Ockham sees one shape.

/**
 * The input with Codex's turn_id where Claude Code has its prompt_id.
 * @param {Record<string, any>} input
 * @returns {Record<string, any>}
 */
export function fromHost(input) {
  return input.prompt_id === undefined && typeof input.turn_id === 'string' ? { ...input, prompt_id: input.turn_id } : input;
}

/**
 * The files a patch touches, each as the call Claude Code would have made for it: Write for a
 * new file, MultiEdit for a changed one (one edit per hunk, its context on both sides), and
 * Delete for one that goes, which is only put aside. A file that is moved goes from where it
 * was and is changed where it lands. Lines it cannot read are skipped: what a patch says that
 * this does not understand is simply not looked at.
 * @param {string} patch
 * @returns {{ tool_name: string, tool_input: Record<string, any> }[]}
 */
export function patchCalls(patch) {
  /** @type {{ tool_name: string, tool_input: Record<string, any> }[]} */
  const calls = [];
  /** @type {{ kind: 'add' | 'update', path: string, lines: string[], edits: { old_string: string, new_string: string }[] } | null} */
  let file = null;
  /** @type {{ old: string[], new: string[] } | null} */
  let hunk = null;
  const closeHunk = () => {
    if (file && hunk && (hunk.old.length || hunk.new.length)) file.edits.push({ old_string: hunk.old.join('\n'), new_string: hunk.new.join('\n') });
    hunk = null;
  };
  const closeFile = () => {
    closeHunk();
    if (file?.kind === 'add') calls.push({ tool_name: 'Write', tool_input: { file_path: file.path, content: file.lines.length ? `${file.lines.join('\n')}\n` : '' } });
    if (file?.kind === 'update' && file.edits.length) calls.push({ tool_name: 'MultiEdit', tool_input: { file_path: file.path, edits: file.edits } });
    file = null;
  };
  for (const line of String(patch).split(/\r?\n/)) {
    const header = /^\*\*\* (Add File|Update File|Delete File|Move to): (.+)$/.exec(line);
    if (header) {
      const [, what, path] = header;
      if (what === 'Move to') {
        if (file?.kind === 'update') {
          calls.push({ tool_name: 'Delete', tool_input: { file_path: file.path } });
          file.path = path.trim();
        }
        continue;
      }
      closeFile();
      if (what === 'Delete File') calls.push({ tool_name: 'Delete', tool_input: { file_path: path.trim() } });
      else file = { kind: what === 'Add File' ? 'add' : 'update', path: path.trim(), lines: [], edits: [] };
      continue;
    }
    if (/^\*\*\* (?:Begin Patch|End Patch|End of File)\s*$/.test(line)) {
      if (line.startsWith('*** End Patch')) closeFile();
      continue;
    }
    if (!file) continue;
    if (file.kind === 'add') {
      if (line.startsWith('+')) file.lines.push(line.slice(1));
      continue;
    }
    if (line.startsWith('@@')) {
      closeHunk();
      hunk = { old: [], new: [] };
      continue;
    }
    // A blank line inside a hunk is a blank line of context: its leading space is often left out.
    const mark = line === '' && hunk ? ' ' : line[0];
    if (mark !== ' ' && mark !== '-' && mark !== '+') continue;
    hunk ??= { old: [], new: [] };
    if (mark !== '+') hunk.old.push(line.slice(1));
    if (mark !== '-') hunk.new.push(line.slice(1));
  }
  closeFile();
  return calls;
}

/**
 * What a tool call writes, as Claude Code's calls: a Claude Code call as it came, a Codex
 * patch one call for each file it touches, and anything else as it came.
 * @param {Record<string, any>} input
 * @returns {Record<string, any>[]}
 */
export function fileWrites(input) {
  const call = fromHost(input);
  if (call.tool_name !== 'apply_patch') return [call];
  return patchCalls(String(call.tool_input?.command ?? '')).map((one) => ({ ...call, ...one }));
}
