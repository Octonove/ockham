#!/usr/bin/env node
// Draws the README's animation from two recorded sessions of the same ticket: one with
// no tool and one with Ockham. Nothing in it is staged: every step, every sentence and
// every figure is read from the recordings, which `bench/trace.mjs --save` writes.
//
//   node bench/trace.mjs <task> baseline --save docs/demo/<name>.without.json
//   node bench/trace.mjs <task> ockham   --save docs/demo/<name>.with.json
//   node docs/demo/build.mjs docs/demo/<name>.without.json docs/demo/<name>.with.json docs/demo/<name>.svg
import { readFileSync, writeFileSync } from 'node:fs';

const [withoutFile, withFile, outFile] = process.argv.slice(2);
if (!outFile) {
  console.error('Usage: node docs/demo/build.mjs <without.json> <with.json> <out.svg>');
  process.exit(1);
}
const sides = [JSON.parse(readFileSync(withoutFile, 'utf8')), JSON.parse(readFileSync(withFile, 'utf8'))];
if (sides[0].task !== sides[1].task) throw new Error('The two recordings are of different tasks.');

// A README on GitHub is some 850 pixels wide: the drawing is made near that size, so that
// its type is not shrunk to nothing.
const WIDTH = 1000;
const MARGIN = 32;
const COLUMN = (WIDTH - 2 * MARGIN) / 2;                      // width of each side
const CHARS = 48;                                             // what fits in a side at this type size, in the widest of the fonts
const LINE = 24;
const FONT = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/** @param {string} text */
const xml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** @param {string} text @param {number} max */
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
/** @param {number} count @param {string} one */
const plural = (count, one) => `${count} ${one}${count === 1 ? '' : 's'}`;

/**
 * Break a text into lines of at most `max` characters, at spaces.
 * @param {string} text
 * @param {number} max
 * @param {number} most  the most lines to keep; the last one ends in an ellipsis if text is left over
 */
function wrap(text, max, most) {
  const lines = [];
  let line = '';
  for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > most) {
    lines.length = most;
    lines[most - 1] = `${clip(lines[most - 1], max - 2)} …`;
  }
  return lines;
}

/**
 * One step of a session, as a line: the tool and what it was pointed at.
 * @param {{ name: string, input: Record<string, any> }} event
 */
function step(event) {
  const { input } = event;
  const target = String(input.file_path ?? input.pattern ?? input.path ?? input.command ?? '');
  const where = event.name === 'Grep' && input.path && input.path !== '.' ? ` in ${input.path}` : '';
  return { tool: event.name, target: clip(`${event.name === 'Grep' || event.name === 'Glob' ? `"${target}"` : target}${where}`, CHARS - event.name.length - 3) };
}

/** What the hidden check found wrong, in a few words, or nothing. @param {Record<string, any>} score */
function verdict(score) {
  const wrong = [!score.correct && 'the change does not work', !score.safe && 'breaks on input the ticket left out', score.reach === false && 'one place fixed, the other left wrong',
    score.reuse === false && 'wrote its own version of what the project has', score.depsAdded?.length && 'added a dependency'].filter(Boolean);
  return { ok: wrong.length === 0, text: wrong.length ? wrong.join('; ') : 'passes' };
}

/**
 * One side: its lines from the top, and the two it ends with.
 * @param {Record<string, any>} recording
 * @param {string} title
 */
function column(recording, title) {
  /** @type {{ kind: string, tool?: string, text: string }[]} */
  const lines = [{ kind: 'title', text: title }];
  for (const event of recording.events) {
    if (event.type === 'tool') {
      const { tool, target } = step(event);
      lines.push({ kind: 'step', tool, text: target });
    } else if (event.type === 'ockham') {
      // What a hook of Ockham told the session at that point, read from its journal.
      // What it says at the end is said to the agent, in its words: "Ockham, before you finish: ...".
      for (const line of wrap(`Ockham${event.event === 'check' ? ',' : ':'} ${event.text}`, CHARS, 3)) lines.push({ kind: 'ockham', text: line });
    }
  }
  const said = recording.events.filter((/** @type {any} */ event) => event.type === 'says').pop()?.text ?? '';
  for (const line of wrap(said.replace(/`/g, '').replace(/\*\*/g, ''), CHARS, 4)) lines.push({ kind: 'says', text: line });
  const end = recording.events.find((/** @type {any} */ event) => event.type === 'end') ?? { turns: 0, costUsd: 0 };
  const found = verdict(recording.score);
  const close = [
    { kind: found.ok ? 'pass' : 'fail', text: `hidden check: ${found.ok ? '✓' : '✗'} ${found.text}` },
    { kind: 'cost', text: `${plural(end.turns, 'turn')} · ${plural(recording.score.sourceLinesAdded, 'line')} of code · ${recording.score.wroteTests ? 'a test' : 'no test'} · $${end.costUsd.toFixed(3)}` },
  ];
  return { lines, close };
}

const TICKET_CHARS = Math.floor((WIDTH - 2 * MARGIN) / 9.1) - 8;
const ticket = wrap(sides[0].prompt, TICKET_CHARS, 3);
// A recording of an arm that switches parts of Ockham off says which part it shows.
const TITLES = { ockham: 'WITH OCKHAM', 'ockham-checks': 'WITH ONLY ITS LOOK AT THE END' };
const columns = [column(sides[0], 'WITHOUT OCKHAM'), column(sides[1], TITLES[/** @type {keyof typeof TITLES} */ (sides[1].arm)] ?? 'WITH OCKHAM')];
const rows = Math.max(columns[0].lines.length, columns[1].lines.length);
const top = 86 + ticket.length * LINE;
// Both sides end on the same two rows, under the longer of them: the verdicts are read together.
const closeY = top + (rows + 1) * LINE;
const HEIGHT = closeY + LINE + 30;

// Every line appears at its moment and all of them go out together, so the loop starts clean.
const STEP = 0.55;                                            // seconds between lines
const lead = 1.2;
const closeAt = lead + rows * STEP + 0.4;
const total = closeAt + 7.5;                                  // time to read the end
/** @type {string[]} */
const keyframes = [];
/** @type {string[]} */
const body = [];
let serial = 0;
/** @param {number} seconds */
function appearAt(seconds) {
  const name = `a${serial++}`;
  const at = (seconds / total) * 100;
  keyframes.push(`@keyframes ${name}{0%,${at.toFixed(2)}%{opacity:0}${(at + 0.8).toFixed(2)}%,97%{opacity:1}100%{opacity:0}}`);
  return `style="animation:${name} ${total.toFixed(2)}s linear infinite"`;
}

ticket.forEach((line, index) => {
  body.push(`<text x="${MARGIN}" y="${74 + index * LINE}" class="${index === 0 ? 'ticket first' : 'ticket'}">${xml(index === 0 ? `ticket  ${line}` : `        ${line}`)}</text>`);
});
body.push(`<line x1="${MARGIN + COLUMN - 12}" y1="${top - 26}" x2="${MARGIN + COLUMN - 12}" y2="${HEIGHT - 22}" class="rule"/>`);
columns.forEach(({ lines, close }, side) => {
  const x = MARGIN + side * COLUMN + (side ? 12 : 0);
  lines.forEach((line, index) => {
    const y = top + index * LINE;
    const show = appearAt(line.kind === 'title' ? 0.3 : lead + index * STEP);
    if (line.kind === 'step') {
      body.push(`<text x="${x}" y="${y}" ${show}><tspan class="mark">› </tspan><tspan class="tool">${xml(line.tool ?? '')}</tspan><tspan class="path"> ${xml(line.text)}</tspan></text>`);
    } else {
      body.push(`<text x="${x}" y="${y}" class="${line.kind}" ${show}>${xml(line.text)}</text>`);
    }
  });
  close.forEach((line, index) => {
    body.push(`<text x="${x}" y="${closeY + index * LINE}" class="${line.kind}" ${appearAt(closeAt + index * 0.5)}>${xml(line.text)}</text>`);
  });
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="The same ticket given to a coding agent without Ockham and with it: the steps each session took and what the hidden check found.">
<style>
text{font-family:${FONT};font-size:15px;fill:#c9d1d9;white-space:pre}
.ticket{fill:#8b949e}.first{fill:#e6edf3}
.title{fill:#8b949e;font-weight:700;letter-spacing:1px}
.mark{fill:#484f58}.tool{fill:#79c0ff}.path{fill:#e6edf3}
.says{fill:#8b949e;font-style:italic}
.ockham{fill:#e3b341;font-weight:700}
.pass{fill:#3fb950;font-weight:700}.fail{fill:#f85149;font-weight:700}
.cost{fill:#8b949e}
.rule{stroke:#30363d;stroke-width:1}
${keyframes.join('\n')}
@media (prefers-reduced-motion:reduce){text{animation:none!important;opacity:1}}
</style>
<rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="#0d1117"/>
<rect width="${WIDTH}" height="40" rx="12" fill="#161b22"/><rect y="28" width="${WIDTH}" height="12" fill="#161b22"/>
<circle cx="24" cy="20" r="6" fill="#f85149"/><circle cx="44" cy="20" r="6" fill="#d29922"/><circle cx="64" cy="20" r="6" fill="#3fb950"/>
<text x="${WIDTH / 2}" y="25" text-anchor="middle" style="fill:#8b949e;font-size:13px">${xml(sides[0].title)} · two recorded sessions, ${xml(sides[0].model)}</text>
${body.join('\n')}
</svg>
`;
writeFileSync(outFile, svg);
console.log(`${outFile}: ${rows} rows a side, ${total.toFixed(1)} s a loop, ${svg.length} bytes`);
