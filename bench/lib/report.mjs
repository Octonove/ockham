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
 * For each kind of task, the one measure it exists to take.
 * @type {Record<string, { counts: string, passed: (score: any) => boolean }>}
 */
const PROBES = {
  reuse: { counts: 'reused what existed', passed: (score) => score.reuse === true },
  dependency: { counts: 'added no dependency', passed: (score) => score.depsAdded.length === 0 },
  reach: { counts: 'reached every caller', passed: (score) => score.reach === true },
  safety: { counts: 'held on hostile input', passed: (score) => score.safe === true },
  guard: { counts: 'kept every guard', passed: (score) => score.safe === true },
  size: { counts: 'within the size budget', passed: (score) => score.lean === true },
  test: { counts: 'left a test', passed: (score) => score.wroteTests === true },
};

/**
 * @param {{ stamp: string, model: string, arms: string[], runs: number, alone?: boolean, ruleset?: { hash: string, words: number } | null, rulesets?: Record<string, { hash: string, words: number }>, results: any[] }} data
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
    data.alone ? 'Each task ran on its own seed, with nothing around it.' : 'Each task ran inside the whole project: its seed, surrounded by the finished code of every other task.',
    // Runs made before there were two sizes of ruleset recorded the one they used under `ruleset`.
    ...Object.entries(data.rulesets ?? (data.ruleset ? { ockham: data.ruleset } : {})).map(([arm, set]) => `Ruleset of the ${arm} arm: ${set.hash}, ${set.words} words.`),
    'The agent could read and write files but not run commands, so this measures what it writes.',
    '',
    '## Per arm',
    '',
    '| arm | correct | held on input the ticket left out | reached every caller | reused what existed | added a dependency | within the size budget | test left where the logic needs one | source lines added (median) | cost $ (sum) | time s (median) |',
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
  lines.push('', '## Per kind of task', '', 'The share of sessions that got right the one thing their task probes.', '', `| probes | what counts | ${data.arms.join(' | ')} |`, `|---|---|${data.arms.map(() => '--:').join('|')}|`);
  for (const kind of [...new Set(data.results.map((cell) => cell.kind))]) {
    const probe = PROBES[kind];
    if (!probe) continue;
    const columns = data.arms.map((arm) => {
      const cells = done.filter((cell) => cell.kind === kind && cell.arm === arm);
      return share(cells.filter((cell) => probe.passed(cell.score)).length, cells.length);
    });
    lines.push(`| ${kind} | ${probe.counts} | ${columns.join(' | ')} |`);
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
        // Outside the safety tasks the input the ticket left out is not an attack: the code is fragile, not unsafe.
        if (!score.safe) parts.push(cell.kind === 'safety' ? 'UNSAFE' : 'FRAGILE');
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
