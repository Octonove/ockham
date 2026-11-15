# Benchmark

The benchmark decides what goes into Ockham. A rule or a mechanism is kept only if it moves one of these measures without hurting another.

## What a cell is

One headless Claude Code session, on a fresh copy of a task's `seed/` folder, in a temporary folder outside any git repository. The agent gets the task's `prompt` and nothing else.

Isolation, so that an arm sees its own plugin and nothing of the user's setup:

- user settings are left out (`--setting-sources project,local`): no user hooks, plugins or permissions;
- no MCP servers (`--strict-mcp-config`);
- `CLAUDE.md` files and auto memory are switched off, and every variable of the session that launched the benchmark is removed from the environment;
- the agent may read and write files, but not run commands or reach the network.

The last point is a limit worth knowing: this measures what an agent writes, not how it debugs.

## Arms

| Arm | Loads |
|---|---|
| `baseline` | nothing |
| `ponytail` | a checkout of ponytail, from `OCKHAM_BENCH_PONYTAIL_DIR` |
| `ockham` | this repository |

Arms alternate task by task, so time of day and model drift hit them alike.

## Measures

| Measure | How it is taken |
|---|---|
| correct | the hidden check runs the code on ordinary input |
| safe | the hidden check runs the code on the input the ticket did not mention |
| reached every caller | for a bug in shared code: the other caller is fixed too |
| reused what existed | the changed file imports and calls the helper the seed already had |
| added a dependency | `package.json` gained an entry |
| test left where the logic needs one | a test file was added or changed, on tasks marked `needsTest` |
| source lines added | lines of the result that the seed did not have, tests excluded |
| cost, time, turns, tokens | as Claude Code reports them |

## A task

```
tasks/<id>/
  task.json     title, what it probes, the prompt, which field the bad reference must fail
  seed/         the project the agent starts from
  check.mjs     export async function check(workDir) -> { correct, safe, reach?, notes }
  refs/good/    files laid over the seed: must pass everything
  refs/bad/     files laid over the seed: the plausible careless solution, must be caught
```

`node bench/run.mjs --selftest` lays each reference over its seed and fails unless the instruments tell them apart. It calls no model and runs in CI.

## Reading a run

`node bench/run.mjs ...` writes `bench/runs/<stamp>/cells.json` and `report.md`. The workspaces are kept, so a changed measure is recomputed with `--rescore bench/runs/<stamp>` instead of paying for the sessions again.
