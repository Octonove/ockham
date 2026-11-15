// Turns the cells of a run into one Markdown table per measure.

/** @param {number[]} values */
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * @param {number} part
 * @param {number} whole
 */
const share = (part, whole) => (whole ? `${part}/${whole}` : 'n/a');

/**
 * @param {{ stamp: string, model: string, arms: string[], runs: number, results: any[] }} data
 * @returns {string}
 */
export function report(data) {
  const done = data.results.filter((cell) => cell.score);
  const failed = data.results.length - done.length;
  const resolved = [...new Set(data.results.flatMap((cell) => cell.agent.models ?? []))].sort();
  const lines = [
    `# Benchmark run ${data.stamp}`,
    '',
    `Model: ${data.model}${resolved.length ? ` (${resolved.join(', ')})` : ''}. Arms: ${data.arms.join(', ')}. ${data.runs} run(s) per task and arm, ${data.results.length} sessions${failed ? `, ${failed} of them failed to run` : ''}.`,
    'The agent could read and write files but not run commands, so this measures what it writes.',
    '',
    '## Per arm',
    '',
    '| arm | correct | safe | reached every caller | reused what existed | added a dependency | within the size budget | test left where the logic needs one | source lines added (median) | cost $ (sum) | time s (median) |',
    '|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|',
  ];
  for (const arm of data.arms) {
    const cells = done.filter((cell) => cell.arm === arm);
    const reach = cells.filter((cell) => cell.score.reach !== null);
    const reuse = cells.filter((cell) => cell.score.reuse !== null);
    // `lean` is absent from runs scored before the measure existed.
    const sized = cells.filter((cell) => typeof cell.score.lean === 'boolean');
    const risky = cells.filter((cell) => cell.needsTest);
    lines.push([
      '', arm,
      share(cells.filter((cell) => cell.score.correct).length, cells.length),
      share(cells.filter((cell) => cell.score.safe).length, cells.length),
      share(reach.filter((cell) => cell.score.reach).length, reach.length),
      share(reuse.filter((cell) => cell.score.reuse).length, reuse.length),
      share(cells.filter((cell) => cell.score.depsAdded.length).length, cells.length),
      share(sized.filter((cell) => cell.score.lean).length, sized.length),
      share(risky.filter((cell) => cell.score.wroteTests).length, risky.length),
      median(cells.map((cell) => cell.score.sourceLinesAdded)) ?? 'n/a',
      cells.reduce((sum, cell) => sum + cell.agent.costUsd, 0).toFixed(3),
      ((median(cells.map((cell) => cell.agent.durationMs)) ?? 0) / 1000).toFixed(0),
      '',
    ].join(' | ').trim());
  }
  lines.push('', '## Per task', '', `| task | probes | ${data.arms.map((arm) => `${arm}: verdict, lines, cost $`).join(' | ')} |`, `|---|---|${data.arms.map(() => '---').join('|')}|`);
  const tasks = [...new Set(data.results.map((cell) => cell.task))];
  for (const task of tasks) {
    const kind = data.results.find((cell) => cell.task === task)?.kind ?? '';
    const columns = data.arms.map((arm) => {
      const cells = done.filter((cell) => cell.task === task && cell.arm === arm);
      if (!cells.length) return 'did not run';
      const flags = cells.map((cell) => {
        const score = cell.score;
        const parts = [score.correct ? 'correct' : 'WRONG'];
        if (!score.safe) parts.push('UNSAFE');
        if (score.reach === false) parts.push('MISSED A CALLER');
        if (score.reuse === false) parts.push('did not reuse');
        if (score.depsAdded.length) parts.push(`added ${score.depsAdded.join('+')}`);
        if (score.lean === false) parts.push('OVER THE SIZE BUDGET');
        if (score.wroteTests) parts.push('wrote a test');
        return parts.join(' ');
      });
      const linesAdded = median(cells.map((cell) => cell.score.sourceLinesAdded));
      const cost = cells.reduce((sum, cell) => sum + cell.agent.costUsd, 0);
      return `${flags.join(' / ')}, ${linesAdded} lines, ${cost.toFixed(3)}`;
    });
    lines.push(`| \`${task}\` | ${kind} | ${columns.join(' | ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}
