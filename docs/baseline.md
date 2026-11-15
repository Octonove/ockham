# Baseline

What a coding agent does on the benchmark before Ockham changes anything: with no tool at all, and with ponytail, the reference arm. Every later change to Ockham is read against these numbers.

## What was run

- 15 November 2026, Claude Code 2.1.270, model alias `sonnet`, which that version resolves to `claude-sonnet-5`.
- 18 tasks, 5 runs each, 2 arms: 180 sessions. None failed to run.
- Every task ran inside the whole project (some forty source files), with the tools to find, read and write files and no others.
- Reference arm: ponytail 5.3.3, commit `96608e0`.
- Cost as Claude Code reports it: 5.98 $ in all, three cents a session. A session took 15 seconds.

## The numbers

| Measure | No tool | ponytail |
|---|--:|--:|
| Correct | 90/90 | 90/90 |
| Held on input the ticket left out | 86/90 | 85/90 |
| Reached every caller | 14/15 | 10/15 |
| Reused what existed | 16/25 | 25/25 |
| Added a dependency | 0/90 | 0/90 |
| Within the size budget | 15/15 | 15/15 |
| Kept every guard in a rewrite | 5/5 | 5/5 |
| Left a test where the logic needs one | 0/50 | 4/50 |
| Source lines added per session (mean) | 5.5 | 3.6 |
| Cost per session | 0.030 $ | 0.036 $ |

Per task, out of 5 runs. "Clean" means nothing went wrong in any run.

| Task | Probes | No tool | ponytail |
|---|---|---|---|
| `dep-clone` | dependency | clean | clean |
| `dep-debounce` | dependency | 4 wrote their own debounce | clean |
| `dep-uuid` | dependency | clean | clean |
| `guard-discount` | guard | clean | clean |
| `reach-amount` | reach | clean | clean, 3 left a test |
| `reach-pagesize` | reach | 1 missed the pager | clean |
| `reach-vat` | reach | clean | **5 missed the invoice**, 1 left a test |
| `reuse-email` | reuse | **4 wrote their own check, fragile** | clean |
| `reuse-money` | reuse | clean | clean |
| `reuse-retry` | reuse | clean | clean |
| `reuse-slug` | reuse | 1 wrote its own slug | clean |
| `safe-html` | safety | clean | clean |
| `safe-page` | safety | clean | clean |
| `safe-upload-path` | safety | clean | clean |
| `size-csv` | size | clean | **5 fragile: no quoting** |
| `size-quiet` | size | clean | clean |
| `size-timeout` | size | clean | clean |
| `sql-search` | safety | clean | clean |

## What it says

**1. There is nothing to win on correctness.** Both arms: 90 of 90. On tasks of this size the model writes code that works without anybody's help. For Ockham, correct is a guard rail and not a goal: it can only lose there.

**2. With no tool, the agent rewrites what the project already has.** 9 times out of 25. In `dep-debounce`, 4 of 5 wrote their own timer next to the project's `debounce`. In `reuse-email`, 4 of 5 wrote their own pattern for an email address, and the copy is worse than the original: it turns away an address typed with a space after it, which the project's own check accepts. Those are the 4 sessions that did not hold on input the ticket left out.

**3. ponytail fixes that, and breaks two other things every single time.** It reused what existed 25 times out of 25. But:

- In `size-csv`, 5 of 5 wrote the CSV without quoting, so a cell with a comma in it shifts every column after it. Each time the reply said so: "Skipped: CSV quoting/escaping".
- In `reach-vat`, 5 of 5 fixed the rounding at checkout and left the same sum in the invoice, so the two now disagree by a cent. Each reply said: "Skipped: didn't audit other money-rounding spots". With no tool, 5 of 5 found the invoice and fixed both.

A rule to do less made the agent leave out part of the job and report the omission as a saving. That is the failure Ockham's name is about: the smallest change that *works*.

**4. Nobody leaves a test.** 0 of 50 and 4 of 50, on tasks about money, addresses and input from strangers. One caveat: these sessions cannot run a test, which may be why they do not write one.

**5. Three measures are at the ceiling.** No session added a dependency, went over a size budget or dropped a guard while rewriting. On this model these tasks do not tell the arms apart. They stay as guard rails.

**6. ponytail writes less and costs more.** 3.6 lines a session against 5.5, and 21% more per session.

## What Ockham has to do

| Measure | No tool | ponytail | Ockham has to |
|---|--:|--:|---|
| Reused what existed | 16/25 | 25/25 | match ponytail |
| Reached every caller | 14/15 | 10/15 | match no tool |
| Held on input the ticket left out | 86/90 | 85/90 | beat both |
| Left a test where the logic needs one | 0/50 | 4/50 | beat both |
| Source lines added per session | 5.5 | 3.6 | stay near ponytail without cutting what the job needs |
| Cost per session | 0.030 $ | 0.036 $ | not go above ponytail |
| Correct, dependencies, size budget, guards | all | all | lose none |

## Limits

- **Five runs, one model.** One session moves a share of 15 by seven points. A difference of one or two sessions means nothing. The findings above are the ones that repeated 4 or 5 times out of 5.
- **Each finding about ponytail rests on one task.** In the other two reach tasks it reached every caller, 10 of 10. Before saying that it misses callers in general, the benchmark needs more tasks of that kind.
- **The tasks are small and most tickets name the file to change.** That is why three measures are at the ceiling.
- **The project has forty source files.** A real one has hundreds, and there the agent with no tool will probably find less of what exists: on the bare seeds, three or four files each, it reused what existed 6 times out of 7 in the first passes; inside the project, 16 out of 25.
- **No commands.** Nothing here says how an agent debugs, and "left a test" counts a test file that was written, not a test that passes.

## Run it again

```bash
OCKHAM_BENCH_PONYTAIL_DIR=/path/to/ponytail node bench/run.mjs --arms baseline,ponytail --runs 5 --model sonnet --workers 6
```

The run folders are not in the repository (`bench/runs/` is ignored): they hold the workspaces' paths on the machine that ran them. This baseline is the sum of two runs, `20261115T014434Z` and `20261115T014758Z`, added up with `--combine`.
