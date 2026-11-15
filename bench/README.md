# Benchmark

The benchmark decides what goes into Ockham. A rule or a mechanism is kept only if it moves one of these measures without hurting another.

## What a cell is

One headless Claude Code session, on a fresh copy of the project a task starts from, in a temporary folder outside any git repository. The agent gets the task's `prompt` and nothing else.

**The project.** A task's own `seed/` has three or four files. An agent reads them all, so on a bare seed nothing about finding what already exists gets measured: without any tool, the model got 18 of 18 right. So a task runs inside one project of some forty source files: every other task's seed with its good reference on top, the files of `bench/project/`, and this task's seed last. The ticket is the only thing left to do in it, and the helper it should reuse is one file among many. `--alone` runs a task on its bare seed.

**Isolation**, so that an arm sees its own plugin and nothing of the user's setup:

- user settings are left out (`--setting-sources project,local`): no user hooks, plugins, skills or permissions;
- no MCP servers (`--strict-mcp-config`);
- `CLAUDE.md` files and auto memory are switched off, and every variable of the session that launched the benchmark is removed from the environment;
- the agent has the tools to find, read and write files and no others (`--tools Read,Glob,Grep,Edit,Write`): no commands, no network, no subagents;
- no transcript is kept (`--no-session-persistence`) and a session that runs away stops at a spending cap (`--max-usd`, 1.5 by default).

The fourth point is a limit worth knowing: this measures what an agent writes, not how it debugs. It is a list of what is allowed because a list of what is forbidden kept missing things: with no shell to run the tests in, sessions started subagents to try, at seven times the cost of a cell and with no effect on the code.

## Arms

| Arm | Loads |
|---|---|
| `baseline` | nothing |
| `ponytail` | a checkout of ponytail, from `OCKHAM_BENCH_PONYTAIL_DIR` |
| `ockham` | this repository |

Arms alternate task by task, so time of day and model drift hit them alike.

The reference arm is used as its users have it after the first day: its hooks write their state into the user's Claude folder, so a run takes a snapshot of that folder first and puts it back afterwards, and its one-time note about a status line is marked as already seen, or it would reach one cell and not the others.

## Measures

| Measure | How it is taken |
|---|---|
| correct | the hidden check runs the code on ordinary input |
| held on input the ticket left out | the hidden check runs the code on what the ticket did not mention: hostile input in the safety tasks (a failure there reads UNSAFE), awkward but honest input in the others (FRAGILE). In `check.mjs` the field is `safe` |
| reached every caller | for a bug in shared or repeated code: the other place is fixed too |
| reused what existed | the changed file imports and calls the helper the seed already had |
| added a dependency | `package.json` gained an entry |
| within the size budget | on tasks with `budgetLines`: the source lines added stay within it |
| test left where the logic needs one | a test file was added or changed, on tasks marked `needsTest` |
| source lines added | lines of the result that the seed did not have, tests excluded |
| cost, time, turns, tokens | as Claude Code reports them |

Two limits of these instruments:

- A solution that imports a package the seed did not have cannot be loaded by the check, because nobody ran an install. It counts as not correct, and the dependency is reported in its own column.
- "Reused" looks for the import and the call. A solution that copies the helper's body into the file does not count, which is the point.

## A task

```
tasks/<id>/
  task.json     title, what it probes, the prompt, which field the bad reference must fail
  seed/         the project the agent starts from
  check.mjs     export async function check(workDir) -> { correct, safe, reach?, notes }
  refs/good/    files laid over the seed: must pass everything
  refs/bad/     files laid over the seed: the plausible careless solution, must be caught
  refs/<name>/  optional further careless solutions; task.json says which field each must fail
```

Optional fields of `task.json`: `reuse` (the file and the patterns that show the helper was used), `budgetLines` (the source lines a careful change needs at the very most, about twice the good reference), `refs` (further references and the field each must fail).

`node bench/run.mjs --selftest` lays each reference over its seed, inside the project and on its own, and fails unless the instruments tell them apart. It calls no model and runs in CI.

Two tasks must not write the same file, apart from `package.json`: their seeds and good references are laid over one another to make the project.

## The tasks

| Probes | Tasks | A careless change |
|---|---|---|
| reuse | `reuse-slug`, `reuse-money`, `reuse-retry`, `reuse-email` | writes its own version next to the one the project has, and misses a case the original handles |
| dependency | `dep-debounce`, `dep-uuid`, `dep-clone` | installs a library for what the project or the runtime already does |
| reach | `reach-amount`, `reach-vat`, `reach-pagesize` | fixes the place the ticket names and leaves the other one wrong |
| safety | `safe-upload-path`, `sql-search`, `safe-html`, `safe-page` | trusts text that comes from a stranger |
| guard | `guard-discount` | makes a function shorter by dropping the checks that looked like clutter |
| size | `size-quiet`, `size-csv`, `size-timeout` | builds a framework for a change of three lines |

## Running it

```bash
node bench/run.mjs --selftest
node bench/run.mjs --arms baseline,ponytail --runs 1 --model sonnet [--tasks a,b] [--workers 3] [--max-usd 1.5] [--alone]
node bench/run.mjs --rescore bench/runs/<stamp>
node bench/run.mjs --combine bench/runs/<stamp>,bench/runs/<stamp> [--out report.md]
node bench/hook-live.mjs
```

A run writes `bench/runs/<stamp>/cells.json` and `report.md`. The workspaces are kept, so a changed measure is recomputed with `--rescore` instead of paying for the sessions again, and `--combine` adds up runs of the same arms into one report.

`hook-live.mjs` is the contract test of the hooks on a real session: it sets a random word that only the SessionStart hook can pass on, and asks the model for it, with and without the plugin. It needs a logged-in Claude Code and spends a little quota, so it is not part of `npm test`.
